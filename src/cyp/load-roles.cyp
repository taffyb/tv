LOAD CSV WITH HEADERS 
   FROM 'https://raw.githubusercontent.com//taffyb/tv/main/src/data/roles.csv' AS row 
WITH row
WHERE row.characters <> "\N"
WITH row, apoc.convert.fromJsonList(row.characters) AS characters
MATCH (a:Actor {imdbId: row.nconst})-[r :APPEARED_IN]->(e:Episode{imdbId: row.tconst})
SET r.character=characters[0]
RETURN count(r)