import type {
 ForecastHistoryItem,
 ForecastStatus,
} from '@/entities/forecast/model/types'

import {
 OpenLink,
} from '@/components/ui/primitives'

import {
 date,
 days,
} from '@/shared/lib/format'

interface ForecastListProps {
 forecasts: ForecastHistoryItem[]
 compact?: boolean
}

function statusLabel(
    status: ForecastStatus,
): string {
 switch (status) {
  case 'PENDING':
   return 'Ожидает'

  case 'PROCESSING':
   return 'Выполняется'

  case 'FAILED':
   return 'Ошибка'

  case 'COMPLETED':
  default:
   return 'Готов'
 }
}

export function ForecastList({
                              forecasts,
                              compact = false,
                             }: ForecastListProps) {
 return (
     <>
      <div className="desktop-table table-wrap">
       <table>
        <caption className="sr-only">
         История прогнозов
        </caption>

        <thead>
        <tr>
         <th>Товар</th>

         <th>
          Дата создания
         </th>

         <th>
          Горизонт
         </th>

         {!compact && (
             <th>
              Модель
             </th>
         )}

         <th>
          Статус
         </th>

         <th>
                                <span className="sr-only">
                                    Действия
                                </span>
         </th>
        </tr>
        </thead>

        <tbody>
        {forecasts.map(
            forecast => (
                <tr
                    key={
                     forecast.id
                    }
                >
                 <td>
                  <strong>
                   {
                    forecast
                        .productName
                   }
                  </strong>

                  <span className="cell-secondary mono">
                                            {
                                             forecast
                                                 .productSku
                                            }
                                        </span>
                 </td>

                 <td className="nowrap">
                  {
                   date(
                       forecast
                           .createdAt,
                   )
                  }

                  <span className="cell-secondary">
                                            {
                                             date(
                                                 forecast
                                                     .createdAt,
                                                 {
                                                  hour:
                                                      '2-digit',

                                                  minute:
                                                      '2-digit',
                                                 },
                                             )
                                            }
                                        </span>
                 </td>

                 <td>
                  {
                   days(
                       forecast
                           .forecastHorizon,
                   )
                  }
                 </td>

                 {!compact && (
                     <td className="mono">
                      {
                       forecast
                           .modelVersion
                      }
                     </td>
                 )}

                 <td>
                                        <span
                                            className={
                                             `forecast-status forecast-status-${forecast.status.toLowerCase()}`
                                            }
                                        >
                                            {
                                             statusLabel(
                                                 forecast.status,
                                             )
                                            }
                                        </span>
                 </td>

                 <td>
                  <OpenLink
                      to={
                       `/forecasts/${forecast.id}`
                      }
                      label="Открыть"
                  />
                 </td>
                </tr>
            ),
        )}
        </tbody>
       </table>
      </div>

      <div className="mobile-records">
       {forecasts.map(
           forecast => (
               <article
                   className="record-card"
                   key={
                    forecast.id
                   }
               >
                <div className="record-heading">
                 <strong>
                  {
                   forecast
                       .productName
                  }
                 </strong>

                 <span
                     className={
                      `forecast-status forecast-status-${forecast.status.toLowerCase()}`
                     }
                 >
                                    {
                                     statusLabel(
                                         forecast.status,
                                     )
                                    }
                                </span>
                </div>

                <span className="mono muted">
                                {
                                 forecast
                                     .productSku
                                }
                            </span>

                <dl className="record-details">
                 <div>
                  <dt>
                   Создан
                  </dt>

                  <dd>
                   {
                    date(
                        forecast
                            .createdAt,
                    )
                   }
                  </dd>
                 </div>

                 <div>
                  <dt>
                   Горизонт
                  </dt>

                  <dd>
                   {
                    days(
                        forecast
                            .forecastHorizon,
                    )
                   }
                  </dd>
                 </div>

                 {!compact && (
                     <div>
                      <dt>
                       Модель
                      </dt>

                      <dd>
                       {
                        forecast
                            .modelVersion
                       }
                      </dd>
                     </div>
                 )}
                </dl>

                <OpenLink
                    to={
                     `/forecasts/${forecast.id}`
                    }
                    label="Открыть прогноз"
                />
               </article>
           ),
       )}
      </div>
     </>
 )
}