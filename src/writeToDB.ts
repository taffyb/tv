
import neo4j, { Driver, Session } from 'neo4j-driver';
import {
  TvSeries,
  Season,
  Episode,
  CastMember,
  CrewMember,
  CastMemberType,
  TvSeriesCollection
} from './models/tvTypes';

const driver: Driver = neo4j.driver(
  process.env.NEO4J_URI ?? '',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME ?? '',
    process.env.NEO4J_PASSWORD ?? ''
  )
);

async function verifyConnection(): Promise<void> {
  await driver.verifyConnectivity();
  console.log('Connected to Neo4j Aura');
}

async function writeCastMember(
  session: Session,
  episodeId: string,
  cast: CastMember
): Promise<void> {
  await session.run(
    `
    MERGE (a:Actor { imdbId: $imdbId })
    SET a.firstName = $actorFirstName,
        a.lastName  = $actorLastName,
        a.fullName  = $actorFullName

    MERGE (e:Episode { id: $episodeId })

    MERGE (a)-[r:APPEARED_IN { characterName: $characterName }]->(e)
    SET r.type = $type
    `,
    {
      imdbId: cast.imdbId,
      actorFirstName: cast.actorFirstName,
      actorLastName: cast.actorLastName,
      actorFullName: cast.actorFullName,
      episodeId,
      characterName: cast.characterName,
      type: cast.type,
    }
  );
}

async function writeCrewMember(
  session: Session,
  episodeId: string,
  crew: CrewMember,
  role: 'WROTE' | 'DIRECTED'
): Promise<void> {
  await session.run(
    `
    MERGE (p:Person { imdbId: $imdbId })
    SET p.name = $name
    CASE WHEN ${role} = 'WROTE' THEN SET p:Writer END
    CASE WHEN ${role} = 'DIRECTED' THEN SET p:Director END

    MERGE (e:Episode { id: $episodeId })

    MERGE (p)-[:${role}]->(e)
    `,
    {
      imdbId: crew.imdbId,
      name: crew.name,
      episodeId,
    }
  );
}

async function writeEpisode(
  session: Session,
  seasonId: string,
  episode: Episode
): Promise<void> {
  await session.run(
    `
    MERGE (e:Episode { id: $id })
    SET e.name      = $name,
        e.dateAired = $dateAired

    MERGE (s:Season { id: $seasonId })

    MERGE (s)-[:HAS_EPISODE]->(e)
    `,
    {
      id: episode.id,
      name: episode.name,
      dateAired: episode.date_aired,
      seasonId,
    }
  );

  for (const cast of episode.cast ?? []) {
    await writeCastMember(session, episode.id, cast);
  }

  for (const writer of episode.writers ?? []) {
    await writeCrewMember(session, episode.id, writer, 'WROTE');
  }

  for (const director of episode.directors ?? []) {
    await writeCrewMember(session, episode.id, director, 'DIRECTED');
  }
}

async function writeSeason(
  session: Session,
  seriesImdbId: string,
  season: Season
): Promise<void> {
  const seasonId = `${seriesImdbId}-S${season.season_number}`;

  await session.run(
    `
    MERGE (s:Season { id: $seasonId })
    SET s.seasonNumber = $seasonNumber,
        s.seasonAired  = $seasonAired,
        s.episodeCount = $episodeCount

    MERGE (series:TvSeries { imdbId: $seriesImdbId })

    MERGE (series)-[:HAS_SEASON]->(s)
    `,
    {
      seasonId,
      seasonNumber: season.season_number,
      seasonAired: season.season_aired,
      episodeCount: neo4j.int(season.episode_count),
      seriesImdbId,
    }
  );

  for (const episode of season.episodes) {
    await writeEpisode(session, seasonId, episode);
  }
}

async function writeTvSeries(
  session: Session,
  series: TvSeries
): Promise<void> {
  await session.run(
    `
    MERGE (s:TvSeries { imdbId: $imdbId })
    SET s.name        = $name,
        s.startDate   = $startDate,
        s.endDate     = $endDate,
        s.seasonCount = $seasonCount
    `,
    {
      imdbId: series.imdbId,
      name: series.name,
      startDate: series.start_date,
      endDate: series.end_date,
      seasonCount: neo4j.int(series.season_count),
    }
  );

  for (const season of series.seasons) {
    await writeSeason(session, series.imdbId, season);
  }
}

export async function writeTvSeriesCollection(collection: TvSeriesCollection): Promise<void> {

  const session = driver.session();

  try {
    await verifyConnection();
    for (const series of collection.tv_series) {
      console.log(`Writing series: ${series.name}`);
      console.log(` Seasons: ${series.season_count}`);
      await writeTvSeries(session, series);
      console.log(`Done: ${series.name}`);
    }
    console.log('All data written successfully');
  } catch (e) {
    console.error('Error:', (e as Error).message);
    process.exit(1);
  } finally {
    await session.close();
  }
}

export async function closeDriver(): Promise<void> {
    await driver.close();
}