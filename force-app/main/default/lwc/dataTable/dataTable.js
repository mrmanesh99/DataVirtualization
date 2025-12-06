import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getUIConfig from '@salesforce/apex/UIConfigController.getUIConfig';
import getAPIData from '@salesforce/apex/UIConfigController.getAPIData';
import buildUIData from '@salesforce/apex/UIConfigController.buildUIData';
import getAssignableUsers from '@salesforce/apex/UIConfigController.getAssignableUsers';
import sendBulkEmail from '@salesforce/apex/UIConfigController.sendBulkEmail';
import getJSONStore from '@salesforce/apex/UIConfigController.getJSONStore';
import saveJSONStore from '@salesforce/apex/UIConfigController.saveJSONStore';

export default class dataTable extends LightningElement {
    // -------------------------
    // public / api props
    // -------------------------
    @api headerName = 'Account';
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
    @track actionButtons = [];
    @track showSendEmailModal = false;
    @track emailRecipients = [];
    @track emailSubject = '';
    @track emailBody = '';

    @track tableEmptyMessage = 'No Records Found';
    @track tableData = [];          // flattened data used by datatable/pagination
    @track paginatedData = [];      // sliced page data
    @track selectedRows = [];       // selected rows
    @track rowsSelected = [];
    @track columns = [];            // lightning-datatable columns
    @track isRecentlyViewed = false;
    @track listViewOptions = [];
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
    @track showEditMode = false;
    @track filters = [];
    @track tempFilters = [];
    @track activeFilterId = null;
    @track popoverTop = -4;
    @track popoverLeft = -20;
    @track popoverStyle = '';
    @track pinnedListView = null;
    @track selectedListViewId = null;
    @track viewName = 'List View';
    @track showMenuSearch = '';
    @track addFieldModal = false;
    @track isOpen = false;
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

    // nested JSON (from JSON_Store__c) for persistence
    @track nestedData = []; // <- REAL original JSON lives here

    // modal / record view state
    @track showModal = false;
    @track mode = 'view';
    @track modalHeader = '';
    @track activeSectionName;
    @track isFilter = false;
    @track draftValues = [];
    @track showAssignOwnerModal = false;
    @track selectedOwnerId = null;
    @track userOptions = [];

    @track recordToEdit = null;

    // -------------------------
    // lifecycle
    // -------------------------
    connectedCallback() {
        console.log('dataTable component loaded');
        this.loadConfig();
    }

    // -------------------------
    // basic getters / setters
    // -------------------------
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

        if (this.pageSizeOptions?.length && !this.pageSize) {
            this.pageSize = parseInt(this.pageSizeOptions[0].value, 10);
        }
        this.currentPage = 1;
        this.updatePaginatedData();
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
        return this.selectedListViewId === this.pinnedListView ? 'utility:pinned' : 'utility:pin';
    }

    // -------------------------
    // pagination + search + sort
    // -------------------------
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
                    return value && String(value).toLowerCase().includes(this.searchKey);
                })
            );
        }
        this.totalEntries = this.tableData.length;
    }

    // -------------------------
    // row selection / actions
    // -------------------------
    handleRowSelection(event) {
        this.selectedRows = event.detail.selectedRows || [];
        console.log('Selected Rows:', this.selectedRows);
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        console.log('Row Action:', actionName, row);

        switch (actionName) {
            case 'Edit':
                this.openEditModal(row);
                break;
            case 'Delete':
                this.recordToDelete = row;
                this.editObjectName = row['!profile.company'] || row.Name || '';
                this.showDeleteConfirm = true;
                break;
            case 'Send_Email':
                this.sendEmail && this.sendEmail(row);
                break;
            default:
                console.warn('Unhandled action:', actionName);
        }
    }

    // -------------------------
    // dynamic EDIT modal
    // -------------------------
    async openEditModal(row) {
        try {
            this.showDynamicModal = true;

            const data = await buildUIData({
                dataSchemaJson: this.rawDataSchemaConfig
            });

            const record = data.find(d => {
                return (d.fields || []).some(f => {
                    return (
                        (f.name === '!id' && f.value === row['!id']) ||
                        (f.name === 'id' && f.value === row['id'])
                    );
                });
            });

            if (!record) {
                const fallbackFields = Object.keys(row).map(k => ({
                    label: k,
                    name: k,
                    value: row[k],
                    isInput: true,
                    type: 'text'
                }));
                this.dynamicFormFields = { formFields: fallbackFields };
                this.recordToEdit = row;
                return;
            }

            this.dynamicFormFields = {
                formFields: record.fields.map(f => ({
                    ...f,
                    value: row[f.name] !== undefined ? row[f.name] : f.value
                }))
            };

            this.recordToEdit = row;
            this.editObjectName = row['!profile.company'] || '';
        } catch (err) {
            console.error('openEditModal error', err);
            this.showToast('Error', 'Failed to open edit modal', 'error');
        }
    }

    handleFieldInput(event) {
        const payload = event.detail || {};
        const fieldName = payload.name || payload.fieldName;
        const value = payload.value;

        if (!fieldName || !this.dynamicFormFields || !this.dynamicFormFields.formFields) return;

        this.dynamicFormFields.formFields = this.dynamicFormFields.formFields.map(f => {
            if (f.name === fieldName) {
                return { ...f, value };
            }
            return f;
        });
    }

    // 🔥 MAIN EDIT SAVE LOGIC
    async handleDynamicSave() {
        try {
            if (!this.dynamicFormFields || !Array.isArray(this.dynamicFormFields.formFields)) {
                this.showToast('Error', 'No form data to save', 'error');
                return;
            }

            // 1) Build map of changes using flattened paths, e.g. "!profile.contact.phone"
            const changes = {};
            for (const f of this.dynamicFormFields.formFields) {
                changes[f.name] = f.value;
            }

            // 2) Update flattened table row
            const idx = this.findRowIndexById(this.recordToEdit || changes);

            if (idx === -1) {
                const idx2 = this.tableData.findIndex(r => this.keysMatchId(r, changes));
                if (idx2 >= 0) {
                    this.tableData[idx2] = { ...this.tableData[idx2], ...changes };
                } else {
                    this.showToast('Warning', 'Could not find row to update, UI unchanged', 'warning');
                    this.showDynamicModal = false;
                    return;
                }
            } else {
                this.tableData[idx] = { ...this.tableData[idx], ...changes };
            }

            this._originalRows = [...this.tableData];
            this.updatePaginatedData();

            // 3) Apply same changes into ORIGINAL nested JSON (this.nestedData)
            this.applyChangesToNested(changes);

            // 4) Persist nested JSON to Salesforce
            await this.saveJSONToServer();

            // 5) Reset modal
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

    // -------------------------
    // single DELETE
    // -------------------------
    deleteRecord(row) {
        if (!row) return;
        const idx = this.findRowIndexById(row);
        if (idx >= 0) {
            this.tableData.splice(idx, 1);
            this.tableData = [...this.tableData];
            this.updatePaginatedData();
            this.showToast('Success', 'Record deleted successfully', 'success');
        } else {
            this.tableData = this.tableData.filter(r => !this.keysMatchId(r, row));
            this.updatePaginatedData();
            this.showToast('Success', 'Record deleted (filtered) successfully', 'success');
        }
    }

    cancelDeleteRecord() {
        this.showDeleteConfirm = false;
        this.recordToDelete = null;
        this.editObjectName = '';
    }

    async confirmDeleteRecord() {
        if (!this.recordToDelete) {
            this.cancelDeleteRecord();
            return;
        }

        // Remove from flattened table data
        this.tableData = this.tableData.filter(r => !this.keysMatchId(r, this.recordToDelete));
        this.updatePaginatedData();
        this._originalRows = [...this.tableData];

        // Remove from nested JSON & save
        this.removeFromNested(this.recordToDelete);
        await this.saveJSONToServer();

        this.showDeleteConfirm = false;
        this.recordToDelete = null;
        this.editObjectName = '';
        this.showToast('Success', 'Record deleted successfully', 'success');
    }

    // -------------------------
    // helpers (id matching + nested)
    // -------------------------
    findRowIndexById(rowLike) {
        if (!rowLike) return -1;
        const idKeys = ['!id', 'RecordId', 'Id', 'id'];
        for (let i = 0; i < this.tableData.length; i++) {
            const r = this.tableData[i];
            for (const key of idKeys) {
                if (
                    r &&
                    r[key] !== undefined &&
                    rowLike[key] !== undefined &&
                    String(r[key]) === String(rowLike[key])
                ) {
                    return i;
                }
            }
        }
        return -1;
    }

    keysMatchId(a, b) {
        if (!a || !b) return false;
        const idKeys = ['!id', 'RecordId', 'Id', 'id'];
        return idKeys.some(k => a[k] !== undefined && b[k] !== undefined && String(a[k]) === String(b[k]));
    }

    // apply edited flat values into nested JSON object
    applyChangesToNested(changes) {
        if (!this.nestedData || !Array.isArray(this.nestedData)) return;

        const id =
            changes['!id'] ||
            changes.Id ||
            changes.id ||
            changes.RecordId;

        if (id === undefined || id === null) return;

        const idx = this.nestedData.findIndex(rec => String(rec.id) === String(id));
        if (idx === -1) return;

        const record = { ...this.nestedData[idx] };

        Object.keys(changes).forEach(key => {
            if (key === '!id' || key === 'Id' || key === 'id' || key === 'RecordId') {
                return;
            }
            this.setNestedValue(record, key, changes[key]);
        });

        this.nestedData[idx] = record;
    }

    // remove one record from nested JSON
    removeFromNested(row) {
        if (!this.nestedData || !Array.isArray(this.nestedData) || !row) return;

        const id =
            row['!id'] ||
            row.Id ||
            row.id ||
            row.RecordId;

        if (id === undefined || id === null) return;

        this.nestedData = this.nestedData.filter(rec => String(rec.id) !== String(id));
    }

    // set nested value using paths like "!profile.contact.phone"
    setNestedValue(obj, path, value) {
        if (!obj || !path) return;

        if (path.startsWith('!')) {
            path = path.slice(1);
        }

        const parts = path.split('.');
        let current = obj;

        for (let i = 0; i < parts.length; i++) {
            const key = parts[i];

            if (i === parts.length - 1) {
                current[key] = value;
            } else {
                if (
                    current[key] === undefined ||
                    current[key] === null ||
                    typeof current[key] !== 'object'
                ) {
                    current[key] = {};
                }
                current = current[key];
            }
        }
    }

    showToast(title, message, variant = 'info') {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    // -------------------------
    // config + fetching
    // -------------------------
    async loadConfig() {
        try {
            const cfgRec = await getUIConfig({ name: this.configKey });
            if (!cfgRec) throw new Error('No config found for key ' + this.configKey);

            this.rawDataSchemaConfig = cfgRec.DataSchema__c;
            const schema = JSON.parse(cfgRec.DataSchema__c);

            this.columns = (schema.columns || []).map(c => ({ ...c }));
            this.actionButtons = (schema.headerActions || []).map(a => ({
                label: a.ActionLabel,
                name: a.ActionName
            }));

            this.rowActions = (schema.rowActions || []).map(a => ({
                label: a.ActionLabel,
                name: a.ActionName
            }));

            if (this.rowActions.length) {
                this.columns.push({
                    type: 'action',
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
            // 1) Flatten data for table (Apex flattens from JSON_Store__c for you)
            const data = await getAPIData({
                dataSchemaJson: this.rawDataSchemaConfig
            });

            // 2) Load original nested JSON from JSON_Store__c separately
            try {
                const storedJson = await getJSONStore();
                if (storedJson) {
                    this.nestedData = JSON.parse(storedJson);
                } else {
                    this.nestedData = [];
                }
            } catch (e) {
                console.error('Invalid JSON in JSON_Store__c', e);
                this.nestedData = [];
            }

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

    async saveJSONToServer() {
        try {
            if (!this.nestedData) return;
            await saveJSONStore({
                updatedJson: JSON.stringify(this.nestedData)
            });
            console.log('Nested JSON saved to server');
        } catch (e) {
            console.error('Error saving JSON', e);
            this.showToast('Error', 'Failed to save updates', 'error');
        }
    }

    async loadData() {
        try {
            let data = [];
            // placeholder if you use other sources later
        } catch (error) {
            console.error('Error loading list view data:', error);
        }
    }

    // -------------------------
    // filter panel + layout
    // -------------------------
    handleFilterClick() {
        console.log('filter is called');
        this.showFilterPanel = !this.showFilterPanel;
    }

    handleFilterClose() {
        this.showJsonToDataMapper = false;
    }

    get datatableClass() {
        return this.showFilterPanel
            ? 'slds-col slds-size_2-of-3 data-table-div'
            : 'slds-col slds-size_1-of_1 data-table-div';
    }

    // -------------------------
    // header buttons
    // -------------------------
    handleButtonClick(event) {
        const actionName = event.target.dataset.id;
        console.log('TOP ACTION CLICKED:', actionName);

        switch (actionName) {
            case 'Assign_Owner':
                this.handleAssignOwnerClick();
                break;
            case 'Export_To_Excel':
                this.exportToExcel();
                break;
            case 'Send_Email':
                this.handleSendEmailClick();
                break;
            case 'Delete_Records':
                this.handleMassDelete();
                break;
            default:
                console.warn('Unknown header action:', actionName);
        }
    }

    // -------------------------
    // Assign Owner (unchanged)
    // -------------------------
    async handleAssignOwnerClick() {
        if (!this.selectedRows || this.selectedRows.length === 0) {
            this.showToast('Warning', 'Select at least one row to assign owner.', 'warning');
            return;
        }

        try {
            if (!this.userOptions || this.userOptions.length === 0) {
                const users = await getAssignableUsers();
                this.userOptions = users;
            }

            this.showAssignOwnerModal = true;
        } catch (e) {
            console.error('Error loading assignable users', e);
            this.showToast('Error', e.body?.message || e.message || 'Failed to load users', 'error');
        }
    }

    handleOwnerChange(event) {
        this.selectedOwnerId = event.detail.value;
    }

    closeAssignOwnerModal() {
        this.showAssignOwnerModal = false;
        this.selectedOwnerId = null;
    }

    assignOwnerToRecord() {
        if (!this.selectedOwnerId) {
            this.showToast('Warning', 'Please select a new owner.', 'warning');
            return;
        }

        if (!this.selectedRows || this.selectedRows.length === 0) {
            this.showToast('Warning', 'No rows selected.', 'warning');
            return;
        }

        const ownerOption = (this.userOptions || []).find(u => u.value === this.selectedOwnerId);
        const ownerName = ownerOption ? ownerOption.label : 'Selected Owner';

        const idKeys = ['!id', 'RecordId', 'Id', 'id'];
        const matchRow = (a, b) =>
            idKeys.some(k => a[k] !== undefined && b[k] !== undefined && String(a[k]) === String(b[k]));

        this.tableData = this.tableData.map(row => {
            const isSelected = this.selectedRows.some(sel => matchRow(row, sel));
            if (!isSelected) return row;
            return {
                ...row,
                OwnerId: this.selectedOwnerId,
                OwnerName: ownerName
            };
        });

        this._originalRows = this._originalRows.map(row => {
            const isSelected = this.selectedRows.some(sel => matchRow(row, sel));
            if (!isSelected) return row;
            return {
                ...row,
                OwnerId: this.selectedOwnerId,
                OwnerName: ownerName
            };
        });

        this.updatePaginatedData();

        this.showToast('Success', `Owner ${ownerName} assigned to ${this.selectedRows.length} record(s).`, 'success');
        this.closeAssignOwnerModal();
    }

    // -------------------------
    // Export to CSV (unchanged)
    // -------------------------
    exportToExcel() {
        try {
            if (!this.tableData || this.tableData.length === 0) {
                this.showToast('Info', 'No data to export.', 'info');
                return;
            }

            const exportColumns = (this.columns || []).filter(col => col.type !== 'action');

            const headerRow = exportColumns.map(col => `"${col.label || ''}"`).join(',');

            const dataRows = this.tableData.map(row => {
                return exportColumns.map(col => {
                    let val = row[col.fieldName] || '';
                    val = String(val).replace(/"/g, '""');
                    return `"${val}"`;
                }).join(',');
            });

            const csvContent = [headerRow, ...dataRows].join('\n');

            const blob = new Blob([csvContent], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = (this.headerName || 'data') + '.csv';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export error', e);
            this.showToast('Error', e.message || 'Failed to export', 'error');
        }
    }

    // -------------------------
    // Send Email (unchanged)
    // -------------------------
    handleSendEmailClick() {
        if (!this.selectedRows || this.selectedRows.length === 0) {
            this.showToast('Warning', 'Select at least one row to send email.', 'warning');
            return;
        }

        const emailFieldPath = '!profile.contact.email';
        const emails = Array.from(
            new Set(
                this.selectedRows
                    .map(r => r[emailFieldPath])
                    .filter(e => !!e)
            )
        );

        if (!emails.length) {
            this.showToast('Warning', 'No email addresses found on selected rows.', 'warning');
            return;
        }

        this.emailRecipients = emails;
        this.emailSubject = '';
        this.emailBody = '';
        this.showSendEmailModal = true;
    }

    handleEmailSubjectChange(event) {
        this.emailSubject = event.detail.value;
    }

    handleEmailBodyChange(event) {
        this.emailBody = event.detail.value;
    }

    closeSendEmailModal() {
        this.showSendEmailModal = false;
        this.emailRecipients = [];
        this.emailSubject = '';
        this.emailBody = '';
    }

    async sendEmailNow() {
        try {
            if (!this.emailRecipients || !this.emailRecipients.length) {
                this.showToast('Warning', 'No recipients to send.', 'warning');
                return;
            }

            await sendBulkEmail({
                toAddresses: this.emailRecipients,
                subject: this.emailSubject,
                body: this.emailBody
            });

            this.showToast('Success', 'Email sent successfully.', 'success');
            this.closeSendEmailModal();
        } catch (e) {
            console.error('sendEmailNow error', e);
            this.showToast('Error', e.body?.message || e.message || 'Failed to send email', 'error');
        }
    }

    // -------------------------
    // Mass Delete (uses nested save)
    // -------------------------
    async handleMassDelete() {
        if (!this.selectedRows || this.selectedRows.length === 0) {
            this.showToast('Warning', 'No rows selected.', 'warning');
            return;
        }

        const idKeys = ['!id', 'RecordId', 'Id', 'id'];
        const matchRow = (a, b) =>
            idKeys.some(k => a[k] && b[k] && String(a[k]) === String(b[k]));

        // Remove from flattened data
        this.tableData = this.tableData.filter(
            row => !this.selectedRows.some(sel => matchRow(row, sel))
        );
        this._originalRows = [...this.tableData];
        this.updatePaginatedData();

        // Remove from nested JSON
        const idsToDelete = this.selectedRows
            .map(r => r['!id'] || r.Id || r.id || r.RecordId)
            .filter(v => v !== undefined && v !== null)
            .map(v => String(v));

        if (this.nestedData && Array.isArray(this.nestedData)) {
            this.nestedData = this.nestedData.filter(
                rec => !idsToDelete.includes(String(rec.id))
            );
        }

        await this.saveJSONToServer();

        this.showToast('Success', 'Records deleted.', 'success');
    }

    // -------------------------
    // extra helpers (your original ones)
    // -------------------------
    getValue(obj, path) {
        return path.substring(1).split('.').reduce((o, key) => o?.[key], obj);
    }

    setValue(obj, path, value) {
        const parts = path.substring(1).split('.');
        let cur = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = value;
    }
}
