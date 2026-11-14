-- Lobby moves: special moves and upgrades are bought like any avatar item and kept in the player's closet.
-- (slot 'move' / 'upgrade' is never worn, so the outfit rules ignore it.)
insert into bba_private.avatar_items(id,name,slot,cost) values
  ('move-uppercut','Rising Uppercut','move',60),
  ('move-tornado','Tornado Kick','move',80),
  ('move-dash','Flash Dash','move',90),
  ('move-slam','Ground Slam','move',100),
  ('move-wave','Big Bang Wave','move',150),
  ('move-meteor','Meteor Blast','move',200),
  ('up-power-2','Power Level 2','upgrade',75),
  ('up-power-3','Power Level 3','upgrade',150),
  ('up-speed-2','Speed Level 2','upgrade',75),
  ('up-speed-3','Speed Level 3','upgrade',150),
  ('up-blast-2','Blast Level 2','upgrade',75),
  ('up-blast-3','Blast Level 3','upgrade',150)
on conflict(id) do update set name=excluded.name,slot=excluded.slot,cost=excluded.cost;
