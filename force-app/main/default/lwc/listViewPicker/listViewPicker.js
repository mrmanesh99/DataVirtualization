import { LightningElement, api } from 'lwc';

export default class ListViewPicker extends LightningElement {
    @api showMenu;
    @api filteredListViews;
    @api selectListViewId;

    connectedCallback(){
        console.log('Filtered List Views in picker:', this.filteredListViews);
        console.log('Show Menu in picker:', this.showMenu);
        console.log('show the selected list view id:', this.selectListViewId);
    }

    handleSearch(event) {
        console.log('Search term:', event.target.value);
        this.dispatchEvent(new CustomEvent('search', { detail: event.target.value }));
    }

    handleMenuSelect(event) {
        console.log('show filetered list view:', this.filteredListViews);
        console.log('Selected list view:dfghj',  event.currentTarget.dataset);
        this.dispatchEvent(new CustomEvent('menuselect', { detail: event.currentTarget.dataset.id }));
    }
}