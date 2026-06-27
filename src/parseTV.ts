import {
  TvSeries,
  Season,
  Episode,
  CastMember,
  CrewMember,
  CastMemberType,
  TvSeriesCollection
} from './models/tvTypes';

const VALID_CAST_TYPES: CastMemberType[] = ['regular', 'guest star', 'extra'];

function isCastMemberType(value: string): value is CastMemberType {
  return VALID_CAST_TYPES.includes(value as CastMemberType);
}

function parseCastMember(raw: unknown, context: string): CastMember {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`${context}: cast member must be an object`);
  }

  const r = raw as Record<string, unknown>;

  if (typeof r.imdbId !== 'string') throw new Error(`${context}: <${JSON.stringify(r)}> imdbId<${r.imdbId}> must be a string`);
  if (typeof r.characterName !== 'string') throw new Error(`${context}: characterName<${r.characterName}> must be a string`);
  if (typeof r.actorFirstName !== 'string') throw new Error(`${context}: actorFirstName<${r.actorFirstName}> must be a string`);
  if (typeof r.actorLastName !== 'string') throw new Error(`${context}: actorLastName<${r.actorLastName}> must be a string`);
  if (typeof r.actorFullName !== 'string') throw new Error(`${context}: actorFullName<${r.actorFullName}> must be a string`);
  if (typeof r.type !== 'string' || !isCastMemberType(r.type)) {
    throw new Error(`${context}: type must be one of ${VALID_CAST_TYPES.join(', ')}`);
  }

  return {
    imdbId: r.imdbId,
    characterName: r.characterName,
    actorFirstName: r.actorFirstName,
    actorLastName: r.actorLastName,
    actorFullName: r.actorFullName,
    type: r.type,
  };
}

function parseCrewMember(raw: unknown, context: string): CrewMember {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`${context}: crew member must be an object`);
  }

  const r = raw as Record<string, unknown>;

  if (typeof r.imdbId !== 'string') throw new Error(`${context}: imdbId<${r.imdbId}> must be a string`);
  if (typeof r.name !== 'string') throw new Error(`${context}: name must be a string`);

  return {
    imdbId: r.imdbId,
    name: r.name,
  };
}

function parseEpisode(raw: unknown, context: string): Episode {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`${context}: episode must be an object`);
  }

  const r = raw as Record<string, unknown>;

  const writers = (Array.isArray(r.writers) ? r.writers as unknown[] : []).filter((w): w is string => typeof w === "string" && w.trim().length > 0);
  const directors = (Array.isArray(r.directors) ? r.directors as unknown[] : []).filter((d): d is string => typeof d === "string" && d.trim().length > 0);



  if (typeof r.id !== 'string') throw new Error(`${context}: id must be a string`);
  if (typeof r.name !== 'string') throw new Error(`${context}: name must be a string`);
  if (typeof r.date_aired !== 'string') throw new Error(`${context}: date_aired must be a string`);
  if (!Array.isArray(r.cast)) throw new Error(`${context}: cast must be an array`);
  // if (!Array.isArray(r.writers)) throw new Error(`${context}: writers must be an array`);
  // if (!Array.isArray(r.directors)) throw new Error(`${context}: directors must be an array`);

  return {
    id: r.id,
    name: r.name,
    date_aired: r.date_aired,
    cast: r.cast.map((c, i) => parseCastMember(c, `${context}.cast[${i}]`)),
    writers: writers.map((w, i) => parseCrewMember(w, `${context}.writers[${i}]`)),
    directors: directors.map((d, i) => parseCrewMember(d, `${context}.directors[${i}]`)),
  };
}

function parseSeason(raw: unknown, context: string): Season {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`${context}: season must be an object`);
  }

  const r = raw as Record<string, unknown>;

  if (typeof r.season_number !== 'number') throw new Error(`${context}: season_number must be a number`);
  if (typeof r.season_aired !== 'string') throw new Error(`${context}: season_aired must be a string`);
  if (typeof r.episode_count !== 'number') throw new Error(`${context}: episode_count must be a number`);
  if (!Array.isArray(r.episodes)) throw new Error(`${context}: episodes must be an array`);

  return {
    season_number: r.season_number,
    season_aired: r.season_aired,
    episode_count: r.episode_count,
    episodes: r.episodes.map((e, i) =>
      parseEpisode(e, `${context}.episodes[${i}]`)
    ),
  };
}

function parseTvSeries(raw: unknown, context: string): TvSeries {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`${context}: tv series must be an object`);
  }

  const r = raw as Record<string, unknown>;

  if (typeof r.name !== 'string') throw new Error(`${context}: name must be a string`);
  if (typeof r.imdbId !== 'string') throw new Error(`${context}: imdbId<${r.imdbId}>  must be a string`);
  if (typeof r.start_date !== 'string') throw new Error(`${context}: start_date must be a string`);
  if (typeof r.end_date !== 'string') throw new Error(`${context}: end_date must be a string`);
  if (typeof r.season_count !== 'number') throw new Error(`${context}: season_count must be a number`);
  if (!Array.isArray(r.seasons)) throw new Error(`${context}: seasons must be an array`);

  return {
    name: r.name,
    imdbId: r.imdbId,
    start_date: r.start_date,
    end_date: r.end_date,
    season_count: r.season_count,
    seasons: r.seasons.map((s, i) =>
      parseSeason(s, `${context}.seasons[${i}]`)
    ),
  };
}

export function parseTvSeriesCollection(json: string): TvSeriesCollection {
  let raw: unknown;

  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${(e as Error).message}`);
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Root must be an object');
  }

  const r = raw as Record<string, unknown>;

  if (!Array.isArray(r.tv_series)) {
    throw new Error('tv_series must be an array');
  }

  return {
    tv_series: r.tv_series.map((s, i) =>
      parseTvSeries(s, `tv_series[${i}]`)
    ),
  };
}