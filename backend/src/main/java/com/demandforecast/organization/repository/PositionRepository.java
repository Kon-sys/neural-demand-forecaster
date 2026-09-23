package com.demandforecast.organization.repository;

import com.demandforecast.organization.model.PositionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface PositionRepository
        extends JpaRepository<PositionEntity, Long>,
        JpaSpecificationExecutor<PositionEntity> {

    boolean existsByDepartment_IdAndNameIgnoreCase(
            Long departmentId,
            String name
    );

    boolean existsByDepartment_IdAndNameIgnoreCaseAndIdNot(
            Long departmentId,
            String name,
            Long id
    );

    List<PositionEntity> findAllByDepartment_Id(
            Long departmentId
    );
}