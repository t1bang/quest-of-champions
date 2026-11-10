update public.bba_content
set content=jsonb_set(content,'{games}',coalesce(content->'games','[]'::jsonb) || jsonb_build_array(jsonb_build_object(
'id','blankman','title','Blankman: The Game','genre','Beat em up','status','playable','room','hall','slot',2,
'color','#ffcf24','trim','#ef2638','play','games/blankman/','cab','assets/cabs/blankman',
'art','assets/cabs/blankman-side.jpg','blurb','A homemade hero, eight comic-book stages, and a wild Blankmobile rail run.',
'shots',jsonb_build_array('assets/cabs/blankman-screen.jpg','assets/cabs/blankman-play.jpg'),'trailer',''))),
revision=revision+1,updated_at=now()
where id in ('draft','published') and not exists(select 1 from jsonb_array_elements(content->'games')g where g->>'id'='blankman')
returning id,revision,jsonb_array_length(content->'games') as game_count;
