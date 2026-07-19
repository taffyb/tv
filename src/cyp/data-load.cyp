CALL apoc.periodic.iterate(
	CALL apoc.load.json('https://raw.githubusercontent.com/taffyb/tv/main/verifiedTvSeries.json') YIELD value
	UNWIND value.tvSeries AS series
	MERGE (tv:TvSeries{imdbId:series.imdbId})
	 ON CREATE
		SET tv.name = series.name
		SET tv.genre = series.genre
	WITH series, tv

	// create directors and relate to the series
	UNWIND series.directors as d
	MERGE (p:Person{imdbId:d})
		SET p:Director
	MERGE (p)-[:DIRECTED]->(tv)
	WITH series, tv


	// create writers and relate to the series
	UNWIND series.writers as w
	MERGE (p:Person{imdbId:w})
		SET p:Writer
	MERGE (p)-[:WROTE]->(tv)


	// create episodes and relate to the series
	WITH series, tv
	UNWIND series.episodes as episode
	MERGE (e:Episode{imdbId:episode.imdbId})
		SET e.seasonNumber  = episode.seasonNumber
		SET e.episodeNumber = episode.episodeNumber
	MERGE (tv)-[:HAS_EPISODE]->(e)

	// create directors and relate to the episode
	WITH episode, e
	UNWIND episode.directors as d
	MERGE (p:Person{imdbId:d})
		SET p:Director
	MERGE (p)-[:DIRECTED]->(e)

	// create writers and relate to the episode
	WITH episode, e
	UNWIND episode.writers as w
	MERGE (p:Person{imdbId:w})
		SET p:Writer
	MERGE (p)-[:WROTE]->(e)
	
  // Config
  {batchSize: 10, iterateList: true, parallel: false}
)
YIELD batches, total, errorMessages
RETURN batches, total, errorMessages;



CALL apoc.periodic.iterate(
  "LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/taffyb/tv/main/filtered-crewNames.tsv' AS row
   FIELDTERMINATOR '\t'
   RETURN row",

  "MERGE (p:Person {imdbId: row.nconst})
   SET p.name = row.primaryName,
       p.birthYear = row.birthYear
   WITH p, row
   WHERE row.deathYear <> '\\N'
   SET p.deathYear = row.deathYear",

  {batchSize: 100, iterateList: true, parallel: false}
)
YIELD batches, total, errorMessages
RETURN batches, total, errorMessages;

CALL apoc.periodic.iterate(
  "LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/taffyb/tv/main/filtered-title.tsv' AS row
   FIELDTERMINATOR '\t'
   RETURN row",

  "MERGE (e:Episode {imdbId: row.tconst})
	 WITH e,row
   SET e.name = row.primaryTitle",

  {batchSize: 100, iterateList: true, parallel: false}
)
YIELD batches, total, errorMessages
RETURN batches, total, errorMessages;

MATCH (tv:TvSeries)-[ :HAS_EPISODE]->(e:Episode)
WITH tv, COLLECT(DISTINCT e.seasonNumber) as seasons
UNWIND seasons as season
MERGE (s:Season{name:tv.imdbId+"-"+season})
 SET s.seasonNumber = season
MERGE (tv)-[:HAS_SEASON]->(s);

MATCH (tv:TvSeries)-[ :HAS_EPISODE]->(e:Episode)
MATCH (tv)-[ :HAS_SEASON]->(s:Season)
WITH tv, s, e
WHERE s.seasonNumber = e.seasonNumber
//MERGE (s)-[:HAS_EPISODE]-(e)
RETURN tv.name, s.seasonNumber, e.episodeNumber
ORDER BY tv.name, s.seasonNumber, e.episodeNumber;

CALL apoc.periodic.iterate(
  "LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/taffyb/tv/main/filtered-principals.tsv' AS row
   FIELDTERMINATOR '\t'
   RETURN row",

  "MATCH (e:Episode {imdbId: row.tconst})
	 MATCH (p:Person{imdbId:row.nconst})
	 WITH e, p,row
   SET p:Actor
	 WITH e, p,row
	 MERGE (p)-[r:ACTED_IN]->(e)
	 SET r.role = row.characters"
	 ,

  {batchSize: 100, iterateList: true, parallel: false}
)
YIELD batches, total, errorMessages
RETURN batches, total, errorMessages;

CALL apoc.periodic.iterate(
  "LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/taffyb/tv/main/filtered-cast.tsv' AS row
   FIELDTERMINATOR '\t'
   RETURN row",

  "MERGE (p:Person {imdbId: row.nconst})
   SET p.name = row.primaryName,
       p.birthYear = row.birthYear
   WITH p, row
   WHERE row.deathYear <> '\\N'
   SET p.deathYear = row.deathYear"
	 ,

  {batchSize: 100, iterateList: true, parallel: false}
)
YIELD batches, total, errorMessages
RETURN batches, total, errorMessages;