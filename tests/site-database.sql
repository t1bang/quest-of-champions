begin;
do $$
declare a uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); visit uuid:=gen_random_uuid(); ev uuid:=gen_random_uuid();
  player jsonb; result jsonb; batch jsonb; rejected boolean; gid text;
begin
  insert into auth.users(id,email,is_anonymous) values(a,a::text||'@example.invalid',false),(other,other::text||'@example.invalid',false);
  perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  player:=public.bba_player('account','{"adult":true,"name":"Site QA"}');
  batch:=jsonb_build_array(jsonb_build_object('id',ev,'visit',visit,'kind','site_enter'));
  result:=public.bba_site('site_events',jsonb_build_object('events',batch));
  if result->>'disabled'<>'true' then raise exception 'Site tracking did not default off';end if;
  perform public.bba_player('preferences','{"analytics":true}');
  foreach gid in array array['quest','vendetta','guerilla','gamerboy','blankman'] loop
    batch:=batch||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'visit',visit,'kind','game_launch','game',gid));
  end loop;
  result:=public.bba_site('site_events',jsonb_build_object('events',batch));
  if result->>'accepted'<>'6' then raise exception 'All-game launch tracking failed';end if;
  result:=public.bba_site('site_events',jsonb_build_object('events',batch));
  if result->>'accepted'<>'0' then raise exception 'Site retries duplicated events';end if;
  result:=public.bba_site('site_events',jsonb_build_object('events',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'visit',visit,'kind','site_enter'))));
  if result->>'accepted'<>'0' then raise exception 'A visit was counted twice';end if;
  rejected:=false;begin perform public.bba_site('site_events',jsonb_build_object('events',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'visit',visit,'kind','typed_text'))));exception when others then rejected:=true;end;
  if not rejected then raise exception 'Private text was accepted as a site event';end if;
  perform public.bba_player('save_put','{"game":"quest","revision":0,"data":{"unlocked":2,"beaten":{"1":true,"99":true},"scores":[{"name":"private","s":999}],"email":"not-for-storage"}}');
  result:=public.bba_player('save_get','{"game":"quest"}');
  if result->'save'->'data' <> '{"unlocked":2,"beaten":{"1":true},"scores":[]}'::jsonb then raise exception 'Quest cloud progress was not sanitized';end if;
  perform public.bba_arcade('earn','{"why":"score","game":"quest","score":1234}');
  result:=public.bba_site('library','{}');
  foreach gid in array array['quest','vendetta','guerilla','gamerboy','blankman'] loop
    if not exists(select 1 from jsonb_array_elements(result->'games')g where g->>'game'=gid) then raise exception 'Missing library game: %',gid;end if;
  end loop;
  if not exists(select 1 from jsonb_array_elements(result->'games')g where g->>'game'='quest' and g->>'save_revision'='1' and g->>'best_score'='1234') then raise exception 'Player library did not join private records';end if;
  result:=public.bba_player('export');if jsonb_array_length(result->'site_activity')<>6 then raise exception 'Site data missing from export';end if;
  perform set_config('request.jwt.claim.sub',other::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',other,'role','authenticated')::text,true);
  perform public.bba_player('account','{"adult":true,"name":"Other Site QA"}');
  result:=public.bba_site('library',jsonb_build_object('pid',player->>'pid'));
  if exists(select 1 from jsonb_array_elements(result->'games')g where g->>'save_revision' is not null or g->>'best_score' is not null) then raise exception 'Another player read private library records';end if;
  rejected:=false;begin perform public.bba_site('site_dashboard');exception when insufficient_privilege then rejected:=true;end;
  if not rejected then raise exception 'Regular player accessed site dashboard';end if;
  perform set_config('request.jwt.claim.sub',(select user_id::text from bba_private.owners limit 1),true);
  result:=public.bba_site('site_dashboard');
  if (result->'site'->>'visits')::int<1 then raise exception 'Owner site metrics missing';end if;
  perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  perform public.bba_player('preferences','{"analytics":false}');
  if exists(select 1 from bba_private.site_events where pid=player->>'pid') then raise exception 'Opt-out left site history';end if;
  if has_table_privilege('authenticated','bba_private.site_events','SELECT') then raise exception 'Site events exposed';end if;
end;$$;
rollback;
select 'Whole-site consent, visits, all five games, deduplication, library ownership, Quest saves, owner metrics, export and deletion passed; fixtures rolled back.' as result;
