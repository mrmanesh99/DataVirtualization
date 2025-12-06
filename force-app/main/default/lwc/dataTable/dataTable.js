import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getUIConfig from '@salesforce/apex/UIConfigController.getUIConfig';
import getAPIData from '@salesforce/apex/UIConfigController.getAPIData';
import buildUIData from '@salesforce/apex/UIConfigController.buildUIData';

export default class dataTable extends LightningElement {
    // -------------------------
    // public / api props
    // -------------------------
    @api headerName= 'Account';
    @api headerIcon;
    @api target; // sObject api name
    @api hideSearch = false;
    @api showPagination = false;
    @api sourceType; // className or JSON
    @api pageSizeOptions = [
        { label: '10', value: 10 },
        { label: '25', value: 25 },
        { label: '50', value: 50 }
    ];
    @api configKey = 'Account V1'; // 'ExternalAPI';

    // -------------------------
    // tracked state
    // -------------------------
    @track tableEmptyMessage = 'No Records Found';
    @track tableData = [];          // active, filtered data used by datatable/pagination
    @track paginatedData = [];      // sliced page data
    @track selectedRows = [];       // selected rows mapped
    @track rowsSelected = [];
    @track columns = [];            // lightning-datatable columns
    @track isRecentlyViewed = false; // track if current view is Recently Viewed
    @track listViewOptions = [];    // dropdown options for list views
    @track listName = '';
    @track apiName = '';
    @track visibility = 'private';
    @track visibilityOptions = [
        { label: 'Only I can see this list view', value: 'private' },
        { label: 'All users can see this list view', value: 'public' },
        { label: 'Share list view with groups of users', value: 'shared' }
    ];

    // list view / UI state
    @track showMenu = false;
    @track showGearMenu = false;
    @track showFilterPanel = false;
    @track showEditMode = false;          // inside filter panel
    @track filters = [];                  // committed filters
    @track tempFilters = [];              // working copy while editing
    @track activeFilterId = null;
    @track popoverTop = -4;
    @track popoverLeft = -20;
    @track popoverStyle = '';
    @track pinnedListView = null;
    @track selectedListViewId = null;
    @track viewName = 'List View';
    @track showMenuSearch = ''; // searchTerm for list view dropdown
    @track addFieldModal = false;
    @track isOpen = false; // general modal (create list view)
    @track isDelete = false;
    @track deletedListViewId = null;
    @track allFilterCondition;
    @track rowActions = [];
    @track dynamicFormFields;
    @track editRecordId;
    @track editObjectName;
    @track showDynamicModal = false;
    @track showDeleteConfirm = false;
    @track recordToDelete = null;
    @track isDeleteMode = false;

    // pagination & sorting & internal storage
    _tableDataRows = [];
    _originalRows = [];
    _tableDataHeaders;
    _idCounter = 0;
    currentPage = 1;
    pageSize = this.pageSizeOptions && this.pageSizeOptions.length ? parseInt(this.pageSizeOptions[0].value, 10) : 10;
    _totalEntries = 0;
    sortedBy;
    sortedDirection = 'asc';
    searchKey = '';
    _editableReapplied = false;

    // modal / record view state (from parent logic)
    @track showModal = false;
    @track mode = 'view'; // 'view'|'edit' from parent row action
    @track modalHeader = '';
    @track activeSectionName;
    @track isFilter = false;
    @track draftValues = [];
    @track showAssignOwnerModal = false;
    @track selectedOwnerId = null;
    @track userOptions = [];

    // Additional for dynamic edit handling
    @track recordToEdit = null; // not required if you use dynamicFormFields, but kept for clarity

    connectedCallback() {
        console.log('dataTable component loaded');
        this.loadConfig();
    }

    @api
    get tableDataRows() {
        return this._tableDataRows;
    }
    set tableDataRows(value) {
        this._tableDataRows = value || [];
        this._originalRows = [...this._tableDataRows];
        if (this.searchKey) {
            this.applySearch();
        } else {
            this.tableData = [...this._originalRows];
        }
        this.totalEntries = this.tableData.length;

        // initialize pageSize if not set
        if (this.pageSizeOptions?.length && !this.pageSize) {
            this.pageSize = parseInt(this.pageSizeOptions[0].value, 10);
        }
        // reset to first page when new data comes
        this.currentPage = 1;
        this.updatePaginatedData();
        // toggle pagination visibility
        this.showPagination = this.totalEntries > (this.pageSize || 0);
    }

    @api
    get totalEntries() {
        return this._totalEntries;
    }
    set totalEntries(value) {
        this._totalEntries = value;
    }

    get totalPages() {
        return Math.ceil(this.totalEntries / this.pageSize) || 1;
    }

    get pageOptions() {
        return Array.from({ length: this.totalPages }, (_, i) => ({
            label: `${i + 1}`,
            value: i + 1
        }));
    }

    get disablePrevious() {
        return this.currentPage <= 1;
    }

    get disableNext() {
        return this.currentPage >= this.totalPages;
    }

    get isEmpty() {
        return this.paginatedData.length === 0;
    }

    get pinnedListViewIcon() {
        return this.selectedListViewId === this.pinnedListView ? "utility:pinned" : "utility:pin";
    }

    handleSaveFilters() {
        this.filters = JSON.parse(JSON.stringify(this.tempFilters || []));
        this.showFilterPanel = false;
    }

    updatePaginatedData() {
        if (!this.tableData || !this.pageSize) {
            this.paginatedData = [];
            return;
        }
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.paginatedData = this.tableData.slice(start, end);
    }

    handlePageSizeChange(event) {
        this.pageSize = parseInt(event.detail.value, 10);
        this.currentPage = 1;
        this.updatePaginatedData();
    }

    handlePageChange(event) {
        this.currentPage = parseInt(event.detail.value, 10);
        this.updatePaginatedData();
    }

    handlePrevious() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePaginatedData();
        }
    }

    handleNext() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePaginatedData();
        }
    }

    handleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        this.sortedBy = sortedBy;
        this.sortedDirection = sortDirection;
        this.sortData(sortedBy, sortDirection);
    }

    sortData(fieldName, direction) {
        let parseData = JSON.parse(JSON.stringify(this.tableData || []));
        let keyValue = (a) => {
            return a && a[fieldName] ? String(a[fieldName]).toLowerCase() : '';
        };
        parseData.sort((x, y) => {
            let val1 = keyValue(x);
            let val2 = keyValue(y);
            return direction === 'asc' ? (val1 > val2 ? 1 : -1) : (val1 < val2 ? 1 : -1);
        });
        this.tableData = parseData;
        // reset pagination to page 1 after sort
        this.currentPage = 1;
        this.updatePaginatedData();
    }

    handleSearchRecords(event) {
        this.searchKey = (event.target.value || '').trim().toLowerCase();
        this.applySearch();
        this.currentPage = 1;
        this.updatePaginatedData();
    }

    applySearch() {
        const searchableFields = (this.columns || []).map(col => col.fieldName).filter(Boolean);
        if (!this.searchKey) {
            this.tableData = [...this._originalRows];
        } else {
            this.tableData = this._originalRows.filter(record =>
                searchableFields.some(field => {
                    const value = record[field];
                    return (
                        value &&
                        String(value).toLowerCase().includes(this.searchKey)
                    );
                })
            );
        }
        this.totalEntries = this.tableData.length;
    }

    // Row selection (keeps selected rows)
    handleRowSelection(event) {
        this.selectedRows = event.detail.selectedRows || [];
        console.log('Selected Rows:', this.selectedRows);
    }

    // Row action (Edit / Delete / Send_Email)
    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        console.log("Row Action:", actionName);
        console.log("Row Data:", row);

        switch(actionName) {
            case "Edit":
                this.openEditModal(row);
                break;
            case "Delete":
                // open confirm modal for the clicked row
                this.recordToDelete = row;
                this.editObjectName = row.Name || '';
                this.showDeleteConfirm = true;
                break;
            case "Send_Email":
                this.sendEmail && this.sendEmail(row);
                break;
            default:
                console.warn('Unhandled action:', actionName);
        }
    }

    // ---------- EDIT flow (dynamic form) ----------
    async openEditModal(row) {
        try {
            this.showDynamicModal = true;
            // buildUIData returns the schema UI structure; you already used it earlier
            const data = await buildUIData({
                dataSchemaJson: this.rawDataSchemaConfig
            });

            // Find matching UI spec by id (!) — same approach you used.
            const record = data.find(d => {
                // support different id paths in the UI spec: field named '!id' or 'id'
                return (d.fields || []).some(f => {
                    return (f.name === '!id' && f.value === row['!id']) || (f.name === 'id' && f.value === row['id']);
                });
            });

            if (!record) {
                // If not found by UI spec, still construct form fields from row keys
                // fallback: create form fields from row flattened keys
                const fallbackFields = Object.keys(row).map(k => ({
                    label: k,
                    name: k,
                    value: row[k],
                    isInput: true,
                    type: 'text'
                }));
                this.dynamicFormFields = { formFields: fallbackFields };
                return;
            }

            // Merge values from actual row into the UI spec fields
            this.dynamicFormFields = {
                formFields: record.fields.map(f => ({
                    ...f,
                    value: (row[f.name] !== undefined) ? row[f.name] : f.value
                }))
            };

            // store a lightweight reference for convenience (not required)
            this.recordToEdit = row;
        } catch (err) {
            console.error('openEditModal error', err);
            this.showToast('Error', 'Failed to open edit modal', 'error');
        }
    }

    // Child dynamic form should dispatch an event { detail: { name, value } } or { detail: { fieldName, value } }
    handleFieldInput(event) {
        const payload = event.detail || {};
        const fieldName = payload.name || payload.fieldName;
        const value = payload.value;

        if (!fieldName || !this.dynamicFormFields || !this.dynamicFormFields.formFields) return;

        // update the matching field in dynamicFormFields
        this.dynamicFormFields.formFields = this.dynamicFormFields.formFields.map(f => {
            if (f.name === fieldName) {
                return { ...f, value };
            }
            return f;
        });
    }

    // called when user clicks Save in dynamic modal
    async handleDynamicSave() {
        try {
            if (!this.dynamicFormFields || !Array.isArray(this.dynamicFormFields.formFields)) {
                this.showToast('Error', 'No form data to save', 'error');
                return;
            }

            // Build a map of changes from form
            const changes = {};
            for (const f of this.dynamicFormFields.formFields) {
                // some fields may be readOnly or non-editable; we still take value
                changes[f.name] = f.value;
            }

            // Find table row index by matching common id fields
            const idx = this.findRowIndexById(this.recordToEdit || changes);

            if (idx === -1) {
                // fallback: try to find by one of the id fields inside changes
                const idx2 = this.tableData.findIndex(r => {
                    return this.keysMatchId(r, changes);
                });
                if (idx2 >= 0) {
                    this.tableData[idx2] = { ...this.tableData[idx2], ...changes };
                } else {
                    // if not found, just close with toast
                    this.showToast('Warning', 'Could not find row to update, UI unchanged', 'warning');
                    this.showDynamicModal = false;
                    return;
                }
            } else {
                this.tableData[idx] = { ...this.tableData[idx], ...changes };
            }

            // update paginated data and UI
            this.updatePaginatedData();

            // close modal
            this.showDynamicModal = false;
            this.dynamicFormFields = null;
            this.recordToEdit = null;

            this.showToast('Success', 'Record updated successfully', 'success');
        } catch (err) {
            console.error('handleDynamicSave error', err);
            this.showToast('Error', 'Failed to save changes', 'error');
        }
    }

    handleDynamicCancel() {
        this.showDynamicModal = false;
        this.dynamicFormFields = null;
        this.recordToEdit = null;
    }

    // ---------- DELETE (local UI) ----------
    // invoked by row action "Delete" in case you want immediate delete
    deleteRecord(row) {
        if (!row) return;
        const idx = this.findRowIndexById(row);
        if (idx >= 0) {
            this.tableData.splice(idx, 1);
            // ensure reactive assignment
            this.tableData = [...this.tableData];
            this.updatePaginatedData();
            this.showToast('Success', 'Record deleted successfully', 'success');
        } else {
            // fallback: filter by id-like keys
            this.tableData = this.tableData.filter(r => !this.keysMatchId(r, row));
            this.updatePaginatedData();
            this.showToast('Success', 'Record deleted (filtered) successfully', 'success');
        }
    }

    // cancel delete modal (HTML uses this)
    cancelDeleteRecord() {
        this.showDeleteConfirm = false;
        this.recordToDelete = null;
        this.editObjectName = '';
    }

    // confirm delete from modal (HTML uses this)
    confirmDeleteRecord() {
        if (!this.recordToDelete) {
            this.cancelDeleteRecord();
            return;
        }
        // remove from tableData
        this.tableData = this.tableData.filter(r => !this.keysMatchId(r, this.recordToDelete));
        this.updatePaginatedData();
        this.showDeleteConfirm = false;
        this.recordToDelete = null;
        this.editObjectName = '';
        this.showToast('Success', 'Record deleted successfully', 'success');
    }

    // ---------- helpers ----------
    // tries to find index in this.tableData using common id keys
    findRowIndexById(rowLike) {
        if (!rowLike) return -1;
        const idKeys = ['!id','RecordId','Id','id'];
        for (let i = 0; i < this.tableData.length; i++) {
            const r = this.tableData[i];
            for (const key of idKeys) {
                if (r && r[key] !== undefined && rowLike[key] !== undefined && String(r[key]) === String(rowLike[key])) {
                    return i;
                }
            }
        }
        return -1;
    }

    // compare two rows by id-like fields
    keysMatchId(a, b) {
        if (!a || !b) return false;
        const idKeys = ['!id','RecordId','Id','id'];
        return idKeys.some(k => a[k] !== undefined && b[k] !== undefined && String(a[k]) === String(b[k]));
    }

    showToast(title, message, variant = 'info') {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    // ------------ config + fetching ------------
    async loadConfig() {
        try {
            const cfgRec = await getUIConfig({ name: this.configKey });
            if (!cfgRec) throw new Error('No config found for key ' + this.configKey);

            this.rawDataSchemaConfig = cfgRec.DataSchema__c;
            const schema = JSON.parse(cfgRec.DataSchema__c);

            // Build columns
            this.columns = (schema.columns || []).map(c => ({ ...c }));
            this.actionButtons = (schema.headerActions || []).map(a => ({
                label: a.ActionLabel,
                name: a.ActionName
            }));

            this.rowActions = (schema.rowActions || []).map(a => ({
                label: a.ActionLabel,
                name: a.ActionName
            }));

            // Append lightning-datatable action column
            if (this.rowActions.length) {
                this.columns.push({
                    type: "action",
                    typeAttributes: {
                        rowActions: this.rowActions
                    }
                });
            }

            await this.fetchRecords();
        } catch (error) {
            console.error('Config Load Error', error);
            this.showToast('Error', error.message || 'Error loading config', 'error');
        }
    }

    async fetchRecords() {
        console.log('Fetch Records');
        try {
            const data = await getAPIData({
                dataSchemaJson: this.rawDataSchemaConfig
            });
            this._originalRows = JSON.parse(JSON.stringify(data || []));
            this.tableData = [...this._originalRows];
            this.totalEntries = this.tableData.length;
            this.currentPage = 1;
            this.updatePaginatedData();

        } catch (e) {
            console.error('Error fetching records:', e);
            this.showToast('Error fetching records', e?.body?.message || e.message || String(e), 'error');
        }
    }

    async loadData() {
        try {
            let data = [];    // if you use fetchData/class based source, call it here
            // data = await fetchData({ className: this.sourceType });

            // this.tableData = JSON.parse(data);
            // fallback: do nothing here for now
        } catch (error) {
            console.error('Error loading list view data:', error);
        }
    }

    handleFilterClick() {
        console.log("filter is called")
        this.showFilterPanel = !this.showFilterPanel;
    }

    handleFilterClose() {
        this.showJsonToDataMapper = false;
    }

    get datatableClass() {
        // shrink table when filter panel is visible
        return this.showFilterPanel ? 'slds-col slds-size_2-of-3 data-table-div' : 'slds-col slds-size_1-of_1 data-table-div';
    }
}