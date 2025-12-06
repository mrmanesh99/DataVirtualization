import { api, track, LightningElement } from 'lwc';
//import updateListViewFields from '@salesforce/apex/CustomListViewController.updateListViewFields';
//import getListViewFields from '@salesforce/apex/CustomListViewController.getListViewFields';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class AddFieldModal extends LightningElement {
    @api ismodalopen;
    @track isModalOpen = true;
    @track selected = [];
    @api columnData;
    @api  selectListViewId;// record Id of Custom_List_View__c

    async connectedCallback() {
        console.log('Selected List View Id in modal:', this.selectListViewId);
        
       /* if (this.selectListViewId) {
            try {
                // Load existing field selections
                const selectedFields = await getListViewFields({ listViewId: this.selectListViewId });
                if (selectedFields && selectedFields.length > 0) {
                    this.selected = selectedFields;
                }
            } catch (error) {
                console.error('Error loading list view fields:', error);
                this.showToast('Error', 'Failed to load existing field selections.', 'error');
            }
        }*/
    }

    // Convert columnData into label/value pairs for dual listbox
    get fieldOptions() {
        if (!this.columnData) return [];
        return this.columnData.map(item => ({
            label: item.label,
            value: item.fieldName
        }));
    }

    handleChange(event) {
        this.selected = event.detail.value; // dual listbox gives selected values as array
        console.log('Selected fields:', this.selected);
    }

    /*async saveSelection() {
        console.log('Saved selected fields:', this.selected);

        if (!this.selectListViewId) {
            this.showToast('Error', 'List View Id is missing — cannot save fields.', 'error');
            return;
        }

        try {
            // Save the selected fields
            await updateListViewFields({
                listViewId: this.selectListViewId,
                selectedFields: this.selected
            });

            // Dispatch event with selected fields for parent component
            this.dispatchEvent(
                new CustomEvent('saveselection', {
                    detail: { 
                        selectedFields: this.selected,
                        listViewId: this.selectListViewId
                    }
                })
            );

            const message = this.selected.length > 0 
                ? `${this.selected.length} field${this.selected.length === 1 ? '' : 's'} saved successfully!`
                : 'All fields have been removed from the list view.';
            
            this.showToast('Success', message, 'success');
            this.closeModal();
        } catch (error) {
            console.error('Error saving fields:', error);
            this.showToast('Error', error.body?.message || 'Failed to save fields.', 'error');
        }
    }*/

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }

    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
        this.dispatchEvent(new CustomEvent('closemodal'));
    }
}