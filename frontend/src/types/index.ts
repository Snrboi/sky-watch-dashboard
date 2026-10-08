/**
 * Types for the app. API shapes come from the generated schema, so nothing here is hand-written
 * API contract. Regenerate with `npm run gen:api` after changing the backend.
 */

import type { components } from "./api.generated";

type Schemas = components["schemas"];

export type GeocodeResponse = Schemas["GeocodeResponse"];
export type Place = Schemas["Place"];
export type Weather = Schemas["Weather"];
export type AirQuality = Schemas["AirQuality"];
export type Pollutants = Schemas["Pollutants"];
export type IssPosition = Schemas["IssPosition"];
export type IssPass = Schemas["IssPass"];
export type PassList = Schemas["PassList"];
export type ApodEntry = Schemas["ApodEntry"];
export type Background = Schemas["Background"];
export type LookupEntry = Schemas["LookupEntry"];
export type LookupList = Schemas["LookupList"];
export type LookupResult = Schemas["LookupResult"];
export type LookupRequest = Schemas["LookupRequest"];
export type Stats = Schemas["Stats"];
export type TrendPoint = Schemas["TrendPoint"];
export type Health = Schemas["Health"];
