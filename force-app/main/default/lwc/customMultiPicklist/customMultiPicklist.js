import { LightningElement, track, api } from 'lwc';

export default class CustomMultiPicklist extends LightningElement {

    @api label;
    @api placeholder;
    @api isRequired;
    @api isDisabled;
    @track inputOptions = [];
    @track inputValue;
    value = [];

    comboboxIsRendered = false;
    dropDownInFocus = false;
    hasRendered = false;
    inputValidationError = '';

    @api
    set selectedValues(values) {
        this._selectedValues = Array.isArray(values) ? values : [];
        this.syncSelectedOptions();
    }
    get selectedValues() {
        return this._selectedValues;
    }

    @api
    get disabled() {
        return this.isDisabled;
    }
    set disabled(value) {
        this.isDisabled = value;
        this.handleDisabled();
    }

    @api
    get options() {
        return this.inputOptions;
    }
    set options(value) {
        this.inputOptions = value;
    }

    connectedCallback() {
        this.inputValue = this.placeholder;
        this.syncSelectedOptions();
    }

    renderedCallback() {
        if (!this.hasRendered) {
            this.handleDisabled();
            this.hasRendered = true;
        }
    }

    syncSelectedOptions() {
        if (!this.inputOptions || !this._selectedValues) return;

        this.value = this.inputOptions
            .filter(option => this._selectedValues.includes(option.value))
            .map(option => ({ ...option }));

        this.updateInputValueDisplay();
        this.applySelectedClasses();
    }

    // New method to apply selected classes in the DOM
    applySelectedClasses() {
        setTimeout(() => {
            const options = this.template.querySelectorAll('.slds-listbox__option');
            if (options) {
                options.forEach(option => {
                    const value = option.parentElement.dataset.value;
                    const isSelected = this.value.some(v => v.value === value);
                    option.classList.toggle('slds-is-selected', isSelected);
                    option.parentElement.setAttribute('data-selected', isSelected);
                });
            }
        });
    }

    updateInputValueDisplay() {
        if (this.value.length > 0) {
            this.inputValue = this.value.map(option => option.label).join(', ');
        } else if (this.value.length === 1) {
            this.inputValue = this.value[0].label;
        } else {
            this.inputValue = this.placeholder;
        }

        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
            const inputElement = this.template.querySelector('.slds-combobox__input');
            if (inputElement) {
                if (this.value.length > 0) {
                    inputElement.classList.remove('inputColor');
                } else {
                    inputElement.classList.add('inputColor');
                }
            }
        });
    }

    handleDisabled() {
        const input = this.template.querySelector("input");
        if (input) {
            input.disabled = this.disabled;
        }
    }

    handleClick() {
        const combobox = this.template.querySelector(".slds-combobox");
        combobox.classList.toggle("slds-is-open");

        if (!this.comboboxIsRendered) {
            this.comboboxIsRendered = true;
        }
    }

    handleSelection(event) {
        const value = event.currentTarget.dataset.value;
        this.toggleSingleOption(event, value);

        const input = this.template.querySelector("input");
        input?.focus();
        this.dispatchSelectedValues();
    }

    toggleSingleOption(event, value) {
        const listBoxOption = event.currentTarget.firstChild;
        const isSelected = listBoxOption.classList.contains("slds-is-selected");

        if (isSelected) {
            // Deselect
            this.value = this.value.filter(option => option.value !== value);
            this.inputOptions = this.inputOptions.map(opt => {
                if (opt.value === value) {
                    return { ...opt, selected: false };
                }
                return opt;
            });
        } else {
            // Select
            const option = this.options.find(opt => opt.value === value);
            if (option) {
                this.value.push({ ...option });
                this.inputOptions = this.inputOptions.map(opt => {
                    if (opt.value === value) {
                        return { ...opt, selected: true };
                    }
                    return opt;
                });
            }
        }
        this.updateInputValueDisplay();
        listBoxOption.classList.toggle("slds-is-selected");
    }

    dispatchSelectedValues() {
        const selectedValues = this.value.map(option => option.value);
        this.dispatchEvent(new CustomEvent("valuechange", { detail: selectedValues }));
    }

    handleBlur() {
        if (!this.dropDownInFocus) {
            this.closeDropdown();
        }
        this.validateField();
    }

    handleMouseEnter() {
        this.dropDownInFocus = true;
    }

    handleMouseleave() {
        this.dropDownInFocus = false;
    }

    closeDropdown() {
        const combobox = this.template.querySelector(".slds-combobox");
        combobox?.classList.remove("slds-is-open");
    }

    @api error() {
        return this.validateField();
    }

    validateField() {
        const combobox = this.template.querySelector(".slds-combobox");
        const hasError = this.isRequired && !this.value?.length;

        if (combobox) combobox?.classList.toggle("slds-has-error", hasError);

        this.inputValidationError = hasError ? 'Complete this field.' : '';

        return !hasError;
    }
}