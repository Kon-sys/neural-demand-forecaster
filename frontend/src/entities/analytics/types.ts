export interface Point { date: string; value: number }
export interface Overview {
  history: Point[]
  requestedFrom: string | null
  requestedTo: string | null
  previousDays: number
  previousObservations: number
  previousTotal: number | null
}
export interface Bucket { label: string; observations: number; average: number }
export interface Seasonality {
  coverage: { minDate: string | null; maxDate: string | null; calendarDays: number; observationCount: number; weeks: number; months: number }
  weekdayAvailable: boolean
  monthlyAvailable: boolean
  weekdays: Bucket[]
  months: Bucket[]
}
export interface ModelQuality {
  schemaVersion: number
  source: string
  protocol: string
  testStart: string
  testEnd: string
  observations: number
  seriesCount: number
  metrics: { model: string; mae: number; rmse: number; mape: number | null; observations: number; mapeObservations: number }[]
  daily: { date: string; actual: number; movingAverage: number; lstm: number; movingAverageMae: number; lstmMae: number }[]
}
