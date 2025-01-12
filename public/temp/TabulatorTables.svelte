<script>
    import { TabulatorFull as Tabulator } from "tabulator-tables";
    import { onMount } from "svelte";
    import { store } from "$lib/stores/store.js";
    import { storeError } from "../apiHandler/apiHandler";

    // export let data = [];
    // export let config = {}; // Config containing tableFields
    export let id = "";
    // Table fields to be displayed in the table

    let tableComponent;
    let columns = []; // Initially empty, populated dynamically
    let defaultLimit = 100;
    let res = {};

    // export let filters = {};
    export let filterData = {};
    let lastFetchedData = null;
    let table;

    const fetchTableData = async () => {
        try {
            storeError(await store.report.combined(filterData)); // Fetch data
            // const newData = data;
        } catch (error) {
            console.error("Error fetching table data:", error);
        }
    };
    // Custom Date Editor
    const dateEditor = (cell, onRendered, success, cancel) => {
        const cellValue = cell.getValue();
        const input = document.createElement("input");
        input.type = "date";
        input.style.width = "100%";
        input.value = cellValue
            ? new Date(cellValue).toISOString().split("T")[0]
            : "";

        onRendered(() => input.focus());

        input.addEventListener("change", () => success(input.value));
        input.addEventListener("blur", () => cancel());
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") success(input.value);
            if (e.key === "Escape") cancel();
        });

        return input;
    };
    const dateTimeEditor = (cell, onRendered, success, cancel) => {
        const cellValue = cell.getValue();
        const input = document.createElement("input");
        input.type = "datetime-local"; // Change to datetime-local for date and time
        input.style.width = "100%";

        // Format the cell value into a valid datetime-local format (YYYY-MM-DDTHH:MM)
        const formattedValue = cellValue
            ? new Date(cellValue).toISOString().slice(0, 16)
            : "";
        input.value = formattedValue;

        onRendered(() => input.focus()); // Ensure input gets focused on render

        input.addEventListener("change", () => success(input.value)); // Commit the change
        input.addEventListener("blur", () => cancel()); // Cancel on blur
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") success(input.value); // Commit on Enter key
            if (e.key === "Escape") cancel(); // Cancel on Escape key
        });

        return input;
    };

    const autocompleteEditor = (cell, onRendered, success, cancel) => {
        const cellValue = cell.getValue();

        const input = document.createElement("input");
        input.type = "text";
        input.style.width = "100%";
        input.value = cellValue || "";

        const dropdown = document.createElement("ul");
        dropdown.style.position = "absolute";
        dropdown.style.background = "white";
        dropdown.style.border = "1px solid #ccc";
        dropdown.style.padding = "0";
        dropdown.style.margin = "0";
        dropdown.style.listStyleType = "none";
        dropdown.style.zIndex = "10";
        dropdown.style.maxHeight = "150px";
        dropdown.style.overflowY = "auto";

        let suggestions = [];
        let focusedIndex = -1;

        const updateDropdown = () => {
            dropdown.innerHTML = "";

            suggestions.forEach((item, index) => {
                const listItem = document.createElement("li");
                listItem.textContent = item.name;
                listItem.style.padding = "5px";
                listItem.style.cursor = "pointer";
                listItem.style.background =
                    index === focusedIndex ? "#e6e6e6" : "white";

                listItem.addEventListener("mousedown", (e) => {
                    e.preventDefault(); // Prevent blur on click
                    input.value = item.name;
                    success(item.name);
                    cleanupDropdown();

                    // Focus the cell and position the cursor at the end
                    setTimeout(() => {
                        cell.getRow().getTable().navigateToCell(cell);
                        cell.edit();
                        const editor = cell.getElement().querySelector("input");
                        if (editor) {
                            editor.focus();
                            editor.setSelectionRange(
                                editor.value.length,
                                editor.value.length,
                            );
                        }
                    }, 0);
                });

                dropdown.appendChild(listItem);
            });

            document.body.appendChild(dropdown);
            const rect = input.getBoundingClientRect();
            dropdown.style.top = `${rect.bottom + window.scrollY}px`;
            dropdown.style.left = `${rect.left + window.scrollX}px`;
            dropdown.style.width = `${rect.width}px`;
        };
        const scrollToFocusedItem = () => {
            if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
                const focusedItem = dropdown.children[focusedIndex];
                const dropdownTop = dropdown.scrollTop;
                const dropdownBottom = dropdownTop + dropdown.offsetHeight;
                const itemTop = focusedItem.offsetTop;
                const itemBottom = itemTop + focusedItem.offsetHeight;

                // Scroll the dropdown to keep the focused item visible
                if (itemTop < dropdownTop) {
                    dropdown.scrollTop = itemTop; // Scroll up
                } else if (itemBottom > dropdownBottom) {
                    dropdown.scrollTop = itemBottom - dropdown.offsetHeight; // Scroll down
                }
            }
        };

        const fetchSuggestions = async (e) => {
            const query = e.target.value;
            const fieldId = cell.getField();
            const rowData = { ...cell.getRow().getData() }; // Clone the row data

            // Replace the fieldId value with the query
            rowData[fieldId] = query;

            if (query.length > 0) {
                let submitedData = {
                    id,
                    fieldId,
                    data: rowData,
                };
                const [a1] = await Promise.all([
                    store.report.listTableDropdown(submitedData),
                ]);
                if (a1.error == "false") {
                    storeError(a1);
                }
                // console.log($store.report.listTableOptions);
                const dummySuggestions =
                    $store.report.listTableOptions[id] || [];

                suggestions = dummySuggestions.filter((item) =>
                    item.name.toLowerCase().includes(query.toLowerCase()),
                );

                focusedIndex = -1;
                updateDropdown();
            } else {
                cleanupDropdown();
            }
        };

        const cleanupDropdown = () => {
            if (dropdown.parentNode) {
                dropdown.remove();
            }
        };

        input.addEventListener("input", (e) => fetchSuggestions(e));
        input.addEventListener("keydown", (e) => {
            if (e.key === "ArrowDown") {
                focusedIndex = (focusedIndex + 1) % suggestions.length;
                updateDropdown();
                scrollToFocusedItem();
            } else if (e.key === "ArrowUp") {
                focusedIndex =
                    (focusedIndex - 1 + suggestions.length) %
                    suggestions.length;
                updateDropdown();
                scrollToFocusedItem();
            } else if (e.key === "Enter") {
                if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
                    input.value = suggestions[focusedIndex].name;
                    success(suggestions[focusedIndex].name);
                    cleanupDropdown();
                    cell.edit(); // Explicitly re-edit the cell
                } else {
                    success(input.value);
                }
            } else if (e.key === "Escape") {
                cancel();
                cleanupDropdown();
            }
        });

        input.addEventListener("blur", () => {
            cancel();
            cleanupDropdown();
        });

        onRendered(() => {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        });

        return input;
    };

    let tableHeight = 0;

    const calculateFullPageHeight = () => {
        return window.innerHeight; // Full viewport height
    };

    const remapRowData = (rowData, columns) => {
        const mappedData = {};
        columns.forEach((column) => {
            const key = column.field; // The key you are using in the columns array
            const value = rowData[key]; // Access the value in rowData using the key from column.field
            mappedData[key] =
                value !== undefined || value !== NULL ? value : NULL;
        });

        return mappedData;
    };
    let storeData = [];
    onMount(async () => {
        // console.log("run");
        // console.log($store.report.list[id], "asdjask");
        storeData = $store.report.list[id];
        tableHeight = calculateFullPageHeight();

        // Recalculate height on window resize
        window.addEventListener("resize", () => {
            tableHeight = calculateFullPageHeight();
            if (tableComponent && tableComponent.tabulator) {
                tableComponent.tabulator.setHeight(tableHeight);
            }
        });

        // Transform columns if config.tableFields is available
        if ($store.report.config[id] && $store.report.config[id].tableFields) {
            const tableFields = $store.report.config[id].tableFields;

            columns = tableFields.map((field) => ({
                title: field.display || field.name, // Use 'display' if available, fallback to 'name'
                field: field.id || field.name, // Use 'id' or fallback to 'name'
                sorter: field.sorter || "string", // Default sorter
                editor:
                    field.type === "date"
                        ? dateTimeEditor
                        : field.type === "long_string"
                          ? "textarea"
                          : field.type === "autoCompleteText"
                            ? autocompleteEditor
                            : field.type === "number"
                              ? "number"
                              : field.editor || "input",
                hozAlign: field.hozAlign || "left", // Default alignment
                editable:
                    field.hasOwnProperty("isEditable") &&
                    field.isEditable === "false"
                        ? false
                        : true,
                cellClass:
                    field.hasOwnProperty("isEditable") &&
                    field.isEditable === "false"
                        ? "disabled-column" // Apply the 'disabled-column' class
                        : "",
                constraintType: field.hasOwnProperty("constraintType")
                    ? field.constraintType
                    : "",
            }));

            console.log("Transformed Columns:", columns);
        }
        // Tabulator.prototype.defaults.debug = true;

        // Initialize Tabulator
        if (tableComponent) {
            table = new Tabulator(tableComponent, {
                height: tableHeight,
                columns: [
                    {
                        formatter: "rowSelection",
                        titleFormatter: "rowSelection",
                        titleFormatterParams: {
                            rowRange: "active", // Select all rows on current page
                        },
                        hozAlign: "center",
                        headerHozAlign: "center",
                        headerSort: false,
                        cellClick: function (e, cell) {
                            cell.getRow().toggleSelect();
                        },
                        width: 50,
                    },
                    ...columns, // Add your other column definitions here
                ],
                selectable: true, // Enables row selection
                selectableRangeMode: "click",
                data: $store.report.list[id] || [],
                layout: "fitDataFill",

                sortMode: "remote",
                ajaxURL: "dummy_string_url",
                pagination: true,
                paginationSizeSelector: [100, 500, 1000, 2000],
                paginationSize: filterData.pagination?.limit || 100,
                paginationMode: "remote",
                paginationInitialPage: 1,
                paginationButtonCount: 3,
                ajaxRequestFunc: ajaxRequestFunc,
                reactiveData: true,
                rowFormatter: function (row) {
                    // Apply styles for disabled columns
                    row.getCells().forEach((cell) => {
                        if (
                            cell.getColumn().getDefinition().cellClass ===
                            "disabled-column"
                        ) {
                            // Apply a background color for the disabled column
                            // cell.getElement().style.background = "#f0f0f0"; // Light gray or any color you prefer
                        }
                    });
                },
            });
            let selectedRows = []; // Array to store selected rows
            table.on("rowSelected", (row) => {
                const rawRowData = row.getData();
                const remappedData = remapRowData(rawRowData, columns);

                // Add remapped data to the selectedRows array
                selectedRows.push(remappedData);

                store.update((state) => {
                    state.selectedRows = selectedRows;

                    return state;
                });
            });

            // Event for row deselection
            table.on("rowDeselected", (row) => {
                const rawRowData = row.getData();
                const remappedData = remapRowData(rawRowData, columns);

                // Remove the remapped data from the selectedRows array
                selectedRows = selectedRows.filter(
                    (data) => data["1"] !== remappedData["1"], // Assuming `id` is the unique identifier
                );

                store.update((state) => {
                    state.selectedRows = selectedRows;

                    return state;
                });
            });
            // , // Ensure data is available
            // table.setData($store.report.list[id]);
            table.on("cellEdited", (cell) => {
                // if (!cell.getValue()) {
                //     return;
                // }
                const rawRowData = cell.getRow().getData(); // Might return unexpected structure
                const updatedRow = remapRowData(rawRowData, columns); // Transform the data
                // console.log("Mapped Row Data:", updatedRow);
                // Optionally send updated data to server
                createUpdatedData(updatedRow, columns);
            });
            // document
            //     .getElementById("add-row")
            //     .addEventListener("click", function () {
            //         table.addRow({});
            //     });
            table.setPage(1); // Set the initial page
            // table.setPageSize(filterData.pagination.limit);
            if (filterData && filterData.pagination?.page) {
                table.setMaxPage(
                    $store.report.list[id].length == 0
                        ? filterData.pagination.page
                        : filterData.pagination.page + 1,
                );
            }
            // console.log(table);
        } else {
            console.error("Table component is not defined");
        }
        // console.log(table, "table");
    });

    $: if (table && storeData !== $store.report.list[id]) {
        // console.log(table);
        // table.clearData();
        // console.log(table, "table in react");
        table = new Tabulator(tableComponent, {
            height: tableHeight,
            rowHeader: {
                headerSort: false,
                resizable: false,
                frozen: true,
                headerHozAlign: "center",
                hozAlign: "center",
                formatter: "rowSelection",
                titleFormatter: "rowSelection",
                cellClick: function (e, cell) {
                    cell.getRow().toggleSelect();
                },
            },
            data: $store.report.list[id] || [],
            layout: "fitColumns",
            columns: columns,
            sortMode: "remote",
            ajaxURL: "dummy_string_url",
            pagination: true,
            paginationSizeSelector: [100, 500, 1000, 2000],
            paginationSize: filterData.pagination?.limit || 100,
            paginationMode: "remote",
            paginationInitialPage: 1,
            paginationButtonCount: 3,
            ajaxRequestFunc: ajaxRequestFunc,
            reactiveData: true,
            rowFormatter: function (row) {
                // Apply styles for disabled columns
                row.getCells().forEach((cell) => {
                    if (
                        cell.getColumn().getDefinition().cellClass ===
                        "disabled-column"
                    ) {
                        // Apply a background color for the disabled column
                        // cell.getElement().style.background = "#f0f0f0"; // Light gray or any color you prefer
                    }
                });
            },
        });
        table.on("cellEdited", (cell) => {
            // console.log(cell.getRow().getData());
            const rawRowData = cell.getRow().getData(); // Might return unexpected structure
            const updatedRow = remapRowData(rawRowData, columns); // Transform the data
            // console.log("Mapped Row Data:", updatedRow);
            // Optionally send updated data to server
            createUpdatedData(updatedRow, columns);
        });
        table.setPage(1);
        if (filterData && filterData.pagination?.page) {
            table.setMaxPage(
                $store.report.list[id].length == 0
                    ? filterData.pagination.page
                    : filterData.pagination.page + 1,
            );
        }
    }

    async function createUpdatedData(data, columns) {
        const primaryColumn = columns.find(
            (column) => column.constraintType === "primary",
        );

        // Check if the primary column is found
        if (!primaryColumn) {
            console.error("No primary constraint column found.");
            return;
        }

        // Extract the id and value based on the primary column
        const rowId = primaryColumn.field; // Assuming the field name is stored in column.field
        const rowValue = data[primaryColumn.field]; // You can adjust this if the value should be extracted differently

        // Create the formData object
        let formData = {
            id: id, // Set the row id
            row: {
                id: rowId, // Use the id from the primary column
                value: rowValue, // Use the value from the primary column
            },
            data: data, // Include the entire row data as it is
        };

        // Optionally, log or send the formData to the server
        // console.log("Form Data:", formData);
        storeError(await store.report.createUpdate(formData));
    }
    async function ajaxRequestFunc(url, config, params) {
        console.log(params, "params");

        if (params.hasOwnProperty("sort")) {
            if (params.sort.length > 0) {
                filterData.pagination.sort.field = params.sort[0].field;
                filterData.pagination.sort.order = params.sort[0].dir;
            }
        }
        if (params.page && params.size) {
            filterData.pagination.page = params.page; // Current page
            filterData.pagination.limit = params.size; // Page size

            let existingLimits =
                JSON.parse(localStorage.getItem("reportTableLimit")) || {};
            // existingLimits[id] = filterData.pagination.limit || 100;
            localStorage.setItem(
                "reportTableLimit",
                JSON.stringify(existingLimits),
            );
        }

        await fetchTableData();

        const response = {
            data: $store.report.list[id],
            last_page:
                $store.report.list[id].length == 0
                    ? filterData.pagination.page
                    : filterData.pagination.page + 1,
        };

        // Handle enabling/disabling buttons

        return Promise.resolve(response);
    }
</script>

<!-- <div class="flex gap-1 items-center">
    <button class="bg-blue-700 p-1 rounded text-white text-sm" id="add-row"
        >Add Row</button
    >
</div> -->

<div bind:this={tableComponent}></div>

<svelte:head>
    <link
        href="https://unpkg.com/tabulator-tables@5.4.3/dist/css/tabulator.min.css"
        rel="stylesheet"
    />
</svelte:head>
