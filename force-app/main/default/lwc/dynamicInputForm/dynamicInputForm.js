import { LightningElement, api, track } from 'lwc';

export default class DynamicInputForm extends LightningElement {


    // @api modalFields;
    _modalFields;

    @track validationErrors = {};
    @track localModalFields = {};
    @api formFields = [];

    @api
    get modalFields() {
        return this._modalFields;
    }

    // set modalFields(value) {
    //     if (value) {
    //         this._modalFields = value;
    //         this.cloneModalFields(value);
    //     }
    // }

    set modalFields(value) {
        if (value) {
            this._modalFields = JSON.parse(JSON.stringify(value));
            // Immediately sync the internal data
            this.localModalFields = this._modalFields;
            console.log('this.localModalFields>>>'+JSON.stringify(this.localModalFields.formFields));
            this.formFields = this.localModalFields.formFields ;
            console.log('Child initialized fields:'+ this.formFields);
        }
    }

    cloneModalFields(value) {
        this.localModalFields = JSON.parse(JSON.stringify(value));
        //   this.localModalFields = {
        //       formFields: value.formFields.map(field => ({ ...field }))
        //   };
    }

    // handleInputChange(event) {
    //     this.validateField(event.target);
    // }
     handleInputChange(event) {
        const fieldName = event.target.dataset.field;
        const value = event.target.value;

        // update local field values
        if (this.localModalFields?.formFields?.length) {
            this.localModalFields.formFields = this.localModalFields.formFields.map(f =>
                f.name === fieldName ? { ...f, value } : f
            );
        }

        // keep the exposed formFields property in sync
        this.formFields = JSON.parse(JSON.stringify(this.localModalFields.formFields));
        this.dispatchUpdatedFields();
    }


    handleToggleChange(event) {
        const fieldName = event.target.dataset.field;
        const checked = event.target.checked;
        // const fieldConfig = this.localModalFields.formFields.find(f => f.name === fieldName);
        const fieldIndex = this.localModalFields.formFields.findIndex(f => f.name === fieldName);
        if (fieldIndex === -1) return;

        const originalField = this.localModalFields.formFields[fieldIndex];
        // if (fieldConfig) {
        //     fieldConfig.checked = checked;
        //     fieldConfig.value = checked;
        // }

        this.localModalFields.formFields[fieldIndex] = {
            ...originalField,
            checked,
            value: checked
        };

        this.dispatchUpdatedFields();
    }

    handleMultiValueChange(event) {
        const fieldName = event.target.dataset.field;
        const fieldValue = event.detail;
        // const selectedValues = event.detail.map(value => Number(value));
        const fieldIndex = this.localModalFields.formFields.findIndex(f => f.name === fieldName);
        if (fieldIndex === -1) return;

        const originalField = this.localModalFields.formFields[fieldIndex];

        this.localModalFields.formFields[fieldIndex] = {
            ...originalField,
            value: fieldValue
        };

        this.dispatchUpdatedFields();

    }

    handleSearchValueChange(event) {
        const fieldName = event.target.dataset.field;
        const fieldValue = event.detail;
        // const selectedValues = event.detail.map(value => Number(value));
        const fieldIndex = this.localModalFields.formFields.findIndex(f => f.name === fieldName);
        if (fieldIndex === -1) return;

        const originalField = this.localModalFields.formFields[fieldIndex];

        this.localModalFields.formFields[fieldIndex] = {
            ...originalField,
            value: fieldValue
        };

        this.dispatchUpdatedFields();
    }

    validateField(input) {
        const fieldName = input.dataset.field;
        let fieldValue = input.value?.trim();

        // const fieldConfig = this.localModalFields.formFields.find(f => f.name === fieldName);
        // if (!fieldConfig) return;
        const fieldIndex = this.localModalFields.formFields.findIndex(f => f.name === fieldName);
        if (fieldIndex === -1) return;

        const originalField = this.localModalFields.formFields[fieldIndex];
        const label = originalField.label || fieldName;
        const maxLength = originalField.maxLength;

        let errorMessage = '';

        if (originalField.required && !fieldValue) {
            errorMessage = 'Complete this field.';
        }
        // validationType as numeric to validate only numeric values
        else if (originalField.validationType === 'numeric') {
            if (fieldValue && !/^\d+$/.test(fieldValue)) {
                errorMessage = originalField.errorMessage.numeric.replace('{0}', label);
            } else if (fieldValue.length > maxLength) {
                errorMessage = originalField.errorMessage.maxLength.replace('{0}', maxLength);
            }
        }
        // validationType as alphabetic to validate only alphabets
        else if (originalField.validationType === 'alphabetic') {
            if (fieldValue && !/^[A-Za-z]+$/.test(fieldValue)) {
                errorMessage = originalField.errorMessage?.alphabetic.replace('{0}', label);
            } else if (fieldValue.length > maxLength) {
                errorMessage = originalField.errorMessage?.maxLength.replace('{0}', maxLength);
            }
        }
        // validationType as nospace to validate no spaces allowed
        else if (originalField.validationType === 'nospace') {
            if (fieldValue && /\s/.test(fieldValue)) {
                errorMessage = originalField.errorMessage.nospace.replace('{0}', label);
            } else if (fieldValue.length > maxLength) {
                errorMessage = originalField.errorMessage.maxLength.replace('{0}', maxLength);
            }
        }
        // validationType as digit to validate digit
        else if (originalField.validationType === 'digit') {
            if (fieldValue && (!/^\d+$/.test(fieldValue) || !/^[0-9]$/.test(fieldValue))) {
                errorMessage = 'Provide a numeric value between 0 and 9';
            }
        }
        //validationType as percentage to validate percentage
        else if (originalField.validationType === 'percentage') {
            if (fieldValue && !/^(100|[1-9]?\d)$/.test(fieldValue)) {
                errorMessage = 'Provide a numeric value between 0 and 100';
            }
        }
        // validationType as url to validate url format
        else if (originalField.validationType === 'url') {
            if (fieldValue && !/^(https?:\/\/)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+){1,2}\.[a-zA-Z]{2,}$/.test(fieldValue)) {
                errorMessage = 'Invalid URL format';
            }
        }
        // validationType for date not to allow select past date
        else if (originalField.validationType === 'currentOrFutureDate') {
            const today = new Date();
            const selectedDate = new Date(fieldValue);

            // Remove time for clean date-only comparison
            today.setHours(0, 0, 0, 0);
            selectedDate.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                errorMessage = `Date must be today or a future date`;
            }
        }
        // validationType for startDate and endDate to validate start date before end date
        else if (originalField.validationType === 'dateBeforeEndDate') {
            const startDate = new Date(fieldValue);
            const endDate = new Date(originalField.endDate); // assuming endDate is passed in originalField

            // Remove time for clean date-only comparison
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            if (startDate >= endDate) {
                errorMessage = `Start date must be before end date`;
            }
        }

        // validationType as email to validate email
        else if (originalField.validationType === 'email') {
            const basicEmailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

            if (fieldValue) {
                // Check overall structure
                if (!basicEmailRegex.test(fieldValue) || /(^\.|\.\.|\.@|@\.)/.test(fieldValue)) {
                    errorMessage = originalField.errorMessage?.email?.replace('{0}', label) || 'Provide a valid Email.';
                } else {
                    const [localPart, domainPart = ''] = fieldValue.split('@');
                    if (localPart.length > 64) {
                        errorMessage = originalField.errorMessage?.localPart || 'The local part of the email (before "@") must not exceed 64 characters.';
                    } else if (domainPart.length > 255) {
                        errorMessage = originalField.errorMessage?.domainPart || 'The domain part of the email (after "@") must not exceed 255 characters.';
                    } else if (fieldValue.length > maxLength) {
                        errorMessage = originalField.errorMessage?.maxLength?.replace('{0}', maxLength) || `Email must not exceed ${maxLength} characters.`;
                    }
                }
            }
        }

        // validationType as phone to validate phone number for Country code (e.g., +1-9876543321, +91-9876543210)
        else if (originalField.validationType === 'phone') {
            const phoneRegex = /^[\d+-]{1,15}$/; // /^\+\d{1,3}-\d+$/
            const cleanedValue = fieldValue?.trim();

            // Check format ONLY — no length check
            if (cleanedValue && !phoneRegex.test(cleanedValue)) {
                errorMessage = originalField.errorMessage?.phone
                    ? originalField.errorMessage.phone.replace('{0}', label)
                    : 'Enter a valid phone number';
            }
        }


        //validationType as currency to validate currency
        else if (originalField.validationType === 'currency') {
            const currencyRegex = /^\d+(\.\d{1,2})?$/;
            if (fieldValue && !currencyRegex.test(fieldValue)) {
                errorMessage = originalField.errorMessage?.currency.replace('{0}', label) || 'Enter a valid amount with up to 2 decimal places';
            } else if (fieldValue.length > maxLength) {
                errorMessage = originalField.errorMessage?.maxLength.replace('{0}', maxLength);
            }
        }

        else if (originalField.validationType === 'positiveDigit') {
            if (fieldValue && !/^\d+$/.test(fieldValue)) {
                errorMessage = originalField.errorMessage.numeric.replace('{0}', label);
            } else if (Number(fieldValue) <= 0) {
                errorMessage = originalField.errorMessage.positiveDigit.replace('{0}', label);
            } else if (fieldValue.length > maxLength) {
                errorMessage = originalField.errorMessage.maxLength.replace('{0}', maxLength);
            }
        }
        else if (originalField.type === 'text' && fieldValue.length > maxLength) {
            errorMessage = originalField.errorMessage.maxLength.replace('{0}', maxLength);
        }

        if (originalField.type === 'datetime' || originalField.type === 'datetime-local') {
            fieldValue = fieldValue ?? ''; // If undefined/null, set to empty string
        }

        if (errorMessage) {
            this.validationErrors[fieldName] = errorMessage;
        } else {
            delete this.validationErrors[fieldName];
        }

        this.localModalFields.formFields[fieldIndex] = {
            ...originalField,
            value: (
                fieldName === 'offerStartDate'
                    ? (hasUserModifiedStartDate && !this.validationErrors.hasOwnProperty('offerStartDate')
                        ? fieldValue
                        : originalField.value)
                    : fieldValue // allow normal update for other fields like offerEndDate
            )
        };

        input.setCustomValidity(errorMessage);
        input.reportValidity();

        if (typeof fieldValue == 'string' && !errorMessage) {
            this.dispatchUpdatedFields();
        }
    }

    dispatchUpdatedFields() {
        this.dispatchEvent(new CustomEvent('fieldinput', { detail: this.localModalFields }));
    }

    // @api validateFields() {
    //     return new Promise((resolve) => {
    //         let isValid = true;
    //         const inputs = this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea');

    //         inputs.forEach(input => {
    //             this.validateField(input);

    //             if (this.validationErrors[input.dataset.field]) {
    //                 isValid = false;
    //             }

    //             if (input?.value && input?.type === 'datetime-local' && typeof input.value != 'string') {
    //                 isValid = false;
    //             }
    //             input.reportValidity();
    //         });
    //         const multiPicklistError = this.template.querySelector('c-custom-multi-picklist');
    //         const errorResult = multiPicklistError ? multiPicklistError.error() : true;

    //         let searchableErrorResult = true;
    //         const dropdownComponents = this.template.querySelectorAll('c-searchable-dropdown');
    //         dropdownComponents.forEach(dropdown => {
    //             const isDropdownValid = dropdown.reportValidity();
    //             if (!isDropdownValid) {
    //                 searchableErrorResult = false;
    //             }
    //         });

    //         this.dispatchUpdatedFields();

    //         resolve(isValid && errorResult && searchableErrorResult);
    //     });
    // }
    @api
    validateFields() {
        return new Promise((resolve) => {
            let isValid = true;
            const inputs = this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea');

            inputs.forEach(input => {
                input.reportValidity();
                if (!input.checkValidity()) {
                    isValid = false;
                }
            });

            // ensure we push the latest values before returning
            this.formFields = JSON.parse(JSON.stringify(this.localModalFields.formFields));

            this.dispatchUpdatedFields();
            resolve(isValid);
        });
    }

    dispatchUpdatedFields() {
        this.dispatchEvent(new CustomEvent('fieldinput', {
            detail: this.localModalFields
        }));
    }

    // This method fully resets the form including disabling all fields and clearing validation errors
    @api clear() {
        // Fully reset formData and validation state
        this.formData = {};
        this.validationErrors = {};

        // Deep clone the original modalFields passed from parent
        this.localModalFields = JSON.parse(JSON.stringify(this._modalFields));

        // Disable all fields (including toggles)
        this.localModalFields.formFields = this.localModalFields.formFields.map(field => {
            if (!field.readOnly) {
                return {
                    ...field,
                    disabled: true,
                    checked: field.isToggle ? field.checked : undefined
                }
            }
            return field;
        });

        // Reset UI inputs and clear browser-level validation messages
        setTimeout(() => {
            const inputs = this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea');
            inputs.forEach(input => {
                input.setCustomValidity('');
                input.reportValidity();
            });
        }, 0);

        // Dispatch fully reset JSON back to parent
        this.dispatchUpdatedFields();
    }

    @api clearValidation() {
        this.validationErrors = {};
        // Clear validation messages on all inputs
        const inputs = this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea');
        inputs.forEach(input => {
            input.setCustomValidity('');
            input.reportValidity();
        });

        // Clear validation messages on multi-picklist component if present
        const multiPicklist = this.template.querySelector('c-custom-multi-picklist');
        if (multiPicklist && multiPicklist.clearError) {
            multiPicklist.clearError();
        }
        // Clear validation messages on searchable-dropdown components if present
        this.clearSearchableDropdown();
    }

    @api clearSearchableDropdown() {
        this.template.querySelectorAll('c-searchable-dropdown').forEach(dropdown => {
            if (dropdown.clear) {
                dropdown.clear();
            }
        });
    }
}