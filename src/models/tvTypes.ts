export type CastMemberType = 'regular' | 'guest star' | 'extra';

export interface CastMember {
  imdbId: string;
  characterName: string;
  actorFirstName: string;
  actorLastName: string;
  actorFullName: string;
  type: CastMemberType;
}

export interface CrewMember {
  imdbId: string;
  name: string;
}

export interface Episode {
  id: string;
  name: string;
  date_aired: string;
  cast?: CastMember[];
  writers?: CrewMember[];
  directors?: CrewMember[];
}

export interface Season {
  season_number: number;
  season_aired: string;
  episode_count: number;
  episodes: Episode[];
}

export interface TvSeries {
  name: string;
  imdbId: string;
  start_date: string;
  end_date?: string;
  season_count: number;
  seasons: Season[];
}

export interface TvSeriesCollection {
  tv_series: TvSeries[];
}