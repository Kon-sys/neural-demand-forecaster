package com.demandforecast.organization.repository;

import com.demandforecast.organization.model.DepartmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DepartmentRepository
        extends JpaRepository<DepartmentEntity, Long>,
        JpaSpecificationExecutor<DepartmentEntity> {

    boolean existsByNameIgnoreCase(
            String name
    );

    boolean existsByNameIgnoreCaseAndIdNot(
            String name,
            Long id
    );
}