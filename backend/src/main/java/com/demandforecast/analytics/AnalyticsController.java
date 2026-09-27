package com.demandforecast.analytics;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {
    private final AnalyticsService analytics;
    private final ModelQualityClient quality;

    public AnalyticsController(AnalyticsService analytics, ModelQualityClient quality) {
        this.analytics = analytics;
        this.quality = quality;
    }

    @GetMapping("/forecasts/{id}")
    public AnalyticsService.Overview overview(@AuthenticationPrincipal(expression = "id") Long userId,
            @PathVariable Long id, @RequestParam(defaultValue = "60") int historyDays) {
        return analytics.overview(userId, id, historyDays);
    }

    @GetMapping("/products/{id}/seasonality")
    public AnalyticsService.Seasonality seasonality(@PathVariable Long id) {
        return analytics.seasonality(id);
    }

    @GetMapping("/model-quality")
    public ModelQualityResponse quality() {
        return quality.get();
    }
}
