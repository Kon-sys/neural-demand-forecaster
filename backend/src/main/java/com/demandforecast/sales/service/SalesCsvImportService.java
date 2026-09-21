package com.demandforecast.sales.service;

import com.demandforecast.common.error.ApiException;
import com.demandforecast.product.model.ProductEntity;
import com.demandforecast.product.repository.ProductRepository;
import com.demandforecast.sales.dto.CsvImportError;
import com.demandforecast.sales.dto.CsvImportResponse;
import com.demandforecast.sales.model.SalesEntity;
import com.demandforecast.sales.repository.SalesRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class SalesCsvImportService {

    private static final String EXPECTED_HEADER =
            "product_sku,date,quantity";

    private final SalesRepository salesRepository;
    private final ProductRepository productRepository;

    public SalesCsvImportService(
            SalesRepository salesRepository,
            ProductRepository productRepository
    ) {
        this.salesRepository = salesRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public CsvImportResponse importCsv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "EMPTY_CSV_FILE",
                    "CSV file must not be empty"
            );
        }

        List<CsvImportError> errors = new ArrayList<>();
        List<SalesEntity> salesToSave = new ArrayList<>();

        Set<String> fileKeys = new HashSet<>();

        int totalRows = 0;

        try (
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(
                                file.getInputStream(),
                                StandardCharsets.UTF_8
                        )
                )
        ) {
            String header = reader.readLine();

            if (header == null) {
                throw invalidFormat();
            }

            header = removeBom(header).trim();

            if (!EXPECTED_HEADER.equals(header)) {
                throw invalidFormat();
            }

            String line;
            int rowNumber = 1;

            while ((line = reader.readLine()) != null) {
                rowNumber++;

                if (line.isBlank()) {
                    continue;
                }

                totalRows++;

                processRow(
                        line,
                        rowNumber,
                        errors,
                        salesToSave,
                        fileKeys
                );
            }

        } catch (IOException exception) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "CSV_READ_ERROR",
                    "Unable to read CSV file"
            );
        }

        salesRepository.saveAll(salesToSave);
        salesRepository.flush();

        int importedRows = salesToSave.size();
        int skippedRows = totalRows - importedRows;

        return new CsvImportResponse(
                totalRows,
                importedRows,
                skippedRows,
                errors
        );
    }

    private void processRow(
            String line,
            int rowNumber,
            List<CsvImportError> errors,
            List<SalesEntity> salesToSave,
            Set<String> fileKeys
    ) {
        String[] columns = line.split(",", -1);

        if (columns.length != 3) {
            errors.add(new CsvImportError(
                    rowNumber,
                    "INVALID_ROW_FORMAT",
                    "Row must contain exactly 3 columns"
            ));
            return;
        }

        String sku = columns[0].trim();
        String dateValue = columns[1].trim();
        String quantityValue = columns[2].trim();

        if (sku.isBlank()) {
            errors.add(new CsvImportError(
                    rowNumber,
                    "INVALID_PRODUCT_SKU",
                    "Product SKU must not be blank"
            ));
            return;
        }

        LocalDate saleDate;

        try {
            saleDate = LocalDate.parse(dateValue);
        } catch (DateTimeParseException exception) {
            errors.add(new CsvImportError(
                    rowNumber,
                    "INVALID_DATE",
                    "Date must use yyyy-MM-dd format"
            ));
            return;
        }

        int quantity;

        try {
            quantity = Integer.parseInt(quantityValue);
        } catch (NumberFormatException exception) {
            errors.add(new CsvImportError(
                    rowNumber,
                    "INVALID_QUANTITY",
                    "Quantity must be an integer"
            ));
            return;
        }

        if (quantity < 0) {
            errors.add(new CsvImportError(
                    rowNumber,
                    "INVALID_QUANTITY",
                    "Quantity must not be negative"
            ));
            return;
        }

        Optional<ProductEntity> productOptional =
                productRepository.findBySku(sku);

        if (productOptional.isEmpty()) {
            errors.add(new CsvImportError(
                    rowNumber,
                    "UNKNOWN_PRODUCT",
                    "Product with SKU " + sku + " was not found"
            ));
            return;
        }

        ProductEntity product = productOptional.get();

        String key = product.getId() + ":" + saleDate;

        if (!fileKeys.add(key)) {
            errors.add(new CsvImportError(
                    rowNumber,
                    "DUPLICATE_SALE",
                    "Duplicate product and date in CSV file"
            ));
            return;
        }

        if (
                salesRepository.existsByProduct_IdAndSaleDate(
                        product.getId(),
                        saleDate
                )
        ) {
            errors.add(new CsvImportError(
                    rowNumber,
                    "DUPLICATE_SALE",
                    "Sale for this product and date already exists"
            ));
            return;
        }

        salesToSave.add(
                SalesEntity.create(
                        product,
                        saleDate,
                        quantity
                )
        );
    }

    private ApiException invalidFormat() {
        return new ApiException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "INVALID_CSV_FORMAT",
                "CSV header must be product_sku,date,quantity"
        );
    }

    private String removeBom(String value) {
        if (
                !value.isEmpty()
                        && value.charAt(0) == '\uFEFF'
        ) {
            return value.substring(1);
        }

        return value;
    }
}