package com.demandforecast.organization.controller;

import com.demandforecast.organization.dto.CreatePositionRequest;
import com.demandforecast.organization.dto.PositionResponse;
import com.demandforecast.organization.dto.UpdatePositionRequest;
import com.demandforecast.organization.service.PositionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/positions")
public class PositionController {

    private final PositionService positionService;

    public PositionController(
            PositionService positionService
    ) {
        this.positionService =
                positionService;
    }

    @GetMapping
    public ResponseEntity<List<PositionResponse>> getPositions(
            @RequestParam(required = false)
            Long departmentId,

            @RequestParam(required = false)
            Boolean active,

            @RequestParam(required = false)
            String search
    ) {
        return ResponseEntity.ok(
                positionService.getPositions(
                        departmentId,
                        active,
                        search
                )
        );
    }

    @PostMapping
    public ResponseEntity<PositionResponse> createPosition(
            @Valid
            @RequestBody
            CreatePositionRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        positionService
                                .createPosition(
                                        request
                                )
                );
    }

    @PatchMapping("/{id}")
    public ResponseEntity<PositionResponse> updatePosition(
            @PathVariable
            Long id,

            @Valid
            @RequestBody
            UpdatePositionRequest request
    ) {
        return ResponseEntity.ok(
                positionService
                        .updatePosition(
                                id,
                                request
                        )
        );
    }
}