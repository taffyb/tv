CALL apoc.periodic.iterate(
  "LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com//taffyb/tv/main/temp/roles.csv' AS row FIELDTERMINATOR '\t' RETURN row",
  "MATCH (a:Actor {imdbId: row.nconst}))-[r:ACTED_IN]->(e:Episode {imdbId: row.tconst})
   WHERE size(split(row.characters,',')) =1
   SET r.role = row.characters[0]",
  {batchSize: 500, parallel: false}
)
YIELD batches, total, errorMessages
RETURN batches, total, errorMessages