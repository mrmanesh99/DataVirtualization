import { LightningElement, track, api } from 'lwc';

export default class SearchableDropdown extends LightningElement {

    @api label = '';
    @api placeholder = '';
    @api isRequired = false;
    @api isDisabled = false;
    @api isReadOnly = false;

    @track inputOptions = [];
    @track filteredOptions = [];
    @track searchKey = '';
    @track selectedOption = null;
    @track isDropdownOpen = false;
    @track showError = false;
    @track hasBeenTouched = false;

    @api
    set selectedValue(value) {
        this._selectedValue = value;
        this.trySetSelectedOption(); // try to set if options are available
    }

    get selectedValue() {
        return this.selectedOption ? this.selectedOption.value : null;
    }

    get showClearButton() {
        return !this.isDisabled && !this.isReadOnly;
    }

    @api
    get options() {
        return this.inputOptions;
    }

    set options(value) {
        this.inputOptions = Array.isArray(value) ? [...value] : [];
        this.filteredOptions = [...this.inputOptions];
        this.trySetSelectedOption();
        this.filterOptions();
    }

    trySetSelectedOption() {
        if ((this._selectedValue === null || this._selectedValue === undefined || this._selectedValue === '')) {
            this.selectedOption = null;
            this.searchKey = '';
            return;
        }

        const match = this.inputOptions?.find(opt => opt.value === this._selectedValue);
        if (match) {
            this.selectedOption = match;
            this.searchKey = match.label;
        } else {
            this.selectedOption = null;
            this.searchKey = '';
        }
        this.validate();
    }

    connectedCallback() {
        document.addEventListener('click', this.handleDocumentClick);
    }

    disconnectedCallback() {
        document.removeEventListener('click', this.handleDocumentClick);
    }

    handleDocumentClick = (event) => {
        const container = this.template.querySelector('.dropdown-container');
        if (container && !container.contains(event.target)) {
            this.isDropdownOpen = false;
        }
    };

    toggleDropdown(event) {
        if (this.isDisabled || this.isReadOnly) return;
        event.stopPropagation();
        this.isDropdownOpen = !this.isDropdownOpen;
        this.hasBeenTouched = true;
        this.validate();
    }

    handleSearch(event) {
        if (this.isDisabled || this.isReadOnly) return;
        this.searchKey = event.target.value;
        this.isDropdownOpen = true;

        // ⬇️ Clear selected option if user starts typing something different
        if (this.selectedOption && this.searchKey !== this.selectedOption.label) {
            this.selectedOption = null;
        }
        this.filterOptions();

        this.dispatchEvent(new CustomEvent('input', {
            detail: null,
            bubbles: true,
            composed: true
        }));
    }

    handleSelect(event) {
        if (this.isDisabled || this.isReadOnly) return;
        const selectedLabel = event.target.textContent;
        const selected = this.options.find(opt => opt.label === selectedLabel);
        this.selectedOption = selected;
        this.searchKey = selected.label;
        this.isDropdownOpen = false;
        this.hasBeenTouched = true;
        this.validate();

        this.dispatchEvent(new CustomEvent('select', {
            detail: selected.value
        }));
    }

    clearSelection() {
        if (this.isDisabled || this.isReadOnly) return;
        this.searchKey = '';
        this.selectedOption = null;
        this.isDropdownOpen = false;
        this.hasBeenTouched = true;
        this.validate();

        this.filterOptions();

        this.dispatchEvent(new CustomEvent('clear', {
            detail: null,
            bubbles: true,
            composed: true
        }));
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.isDropdownOpen = false;
            this.hasBeenTouched = true;
            this.validate();
        }
    }

    filterOptions() {
        if (!this.searchKey) {
            this.filteredOptions = [...this.inputOptions]
                .sort((a, b) => this.naturalSort(a.label, b.label))
                .slice(0, 10);
        } else {
            this.filteredOptions = this.inputOptions
                .filter(opt =>
                    opt.label.toLowerCase().includes(this.searchKey.toLowerCase())
                )
                .sort((a, b) => this.naturalSort(a.label, b.label));
        }
    }

    get isEmpty() {
        return this.filteredOptions.length === 0;
    }

    naturalSort(a, b) {
        const extractNumber = str => parseInt(str.match(/\d+/)?.[0] || 0);
        const baseA = a.toLowerCase().replace(/\d+/g, '');
        const baseB = b.toLowerCase().replace(/\d+/g, '');
        const numA = extractNumber(a);
        const numB = extractNumber(b);

        if (baseA === baseB) {
            return numA - numB;
        }

        return baseA.localeCompare(baseB);
    }

    @api
    reportValidity() {
        return this.validateField();
    }

    validateField() {
        const currentValue = this.selectedOption ? this.selectedOption.value : null;
        if (this.isRequired && !currentValue) {
            this.showError = true;
            return false;
        }
        this.showError = false;
        return true;
    }

    @api clear() {
        this.showError = false;
        this.selectedOption = null;
        this.searchKey = '';

        const inputEl = this.template.querySelector('.search-input');
        if (inputEl && inputEl.classList.contains('error')) {
            inputEl.classList.remove('error');
        }
    }

    validate() {
        if (this.isRequired && this.hasBeenTouched && !this.selectedOption) {
            this.showError = true;
            return false;
        }
        this.showError = false;
        return true;
    }

    get computedInputClass() {
        return `search-input ${this.showError ? 'error' : ''} ${this.isReadOnly ? 'read-only' : ''}`;
    }
}