package com.demandforecast.product.service;

import com.demandforecast.common.error.ApiException;
import com.demandforecast.product.dto.CreateProductRequest;
import com.demandforecast.product.dto.ProductResponse;
import com.demandforecast.product.dto.UpdateProductRequest;
import com.demandforecast.product.model.ProductEntity;
import com.demandforecast.product.repository.ProductRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<ProductResponse> getAll() {
        return productRepository.findAll()
                .stream()
                .map(ProductResponse::from)
                .toList();
    }

    public ProductResponse getById(Long id) {
        return ProductResponse.from(findById(id));
    }

    @Transactional
    public ProductResponse create(CreateProductRequest request) {
        String sku = normalizeRequired(request.sku());
        String name = normalizeRequired(request.name());
        String category = normalizeOptional(request.category());

        if (productRepository.existsBySku(sku)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "PRODUCT_SKU_ALREADY_EXISTS",
                    "Product with this SKU already exists"
            );
        }

        ProductEntity product = ProductEntity.create(
                sku,
                name,
                category
        );

        ProductEntity savedProduct = productRepository.saveAndFlush(product);

        return ProductResponse.from(savedProduct);
    }

    @Transactional
    public ProductResponse update(
            Long id,
            UpdateProductRequest request
    ) {
        ProductEntity product = findById(id);

        String sku = normalizeRequired(request.sku());
        String name = normalizeRequired(request.name());
        String category = normalizeOptional(request.category());

        if (productRepository.existsBySkuAndIdNot(sku, id)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "PRODUCT_SKU_ALREADY_EXISTS",
                    "Product with this SKU already exists"
            );
        }

        product.update(
                sku,
                name,
                category
        );

        productRepository.flush();

        return ProductResponse.from(product);
    }

    @Transactional
    public void delete(Long id) {
        ProductEntity product = findById(id);

        try {
            productRepository.delete(product);
            productRepository.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "PRODUCT_IS_IN_USE",
                    "Product cannot be deleted because it is referenced by other data"
            );
        }
    }

    private ProductEntity findById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "PRODUCT_NOT_FOUND",
                        "Product not found"
                ));
    }

    private String normalizeRequired(String value) {
        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();

        return normalized.isEmpty()
                ? null
                : normalized;
    }
}