package com.demandforecast.organization.repository;

import com.demandforecast.organization.model.PositionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PositionRepository
        extends JpaRepository<PositionEntity, Long> {
}