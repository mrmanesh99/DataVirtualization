import { LightningElement, track, api } from 'lwc';
// import CLOSE_FILTER from '@salesforce/label/c.CLOSE_FILTER';

export default class FilterList extends LightningElement {
    @track filterData = [];
    @api filterList;
    @track filterCloseCssClass = "filterCloseCssClass";
    addConditionData;
    @api
set addCondition(value) {
    this._addCondition = value;
    if (value) {
        console.log('✅ Received addCondition data:', JSON.stringify(value));

        // You can call your logic here safely:
        this.handleAddCondition(value);
    }
}
get addCondition() {
    return this._addCondition;
}
handleAddCondition(value) {
    // Example: store, filter, or display the data

    this.addConditionData = JSON.parse(JSON.stringify(value.inputValue));
    // or update your UI variables
    console.log("✅ Received addCondition data:",this.addConditionData.inputValue);
    // this.filterData= this.getModifiedData(this.addConditionData);
}


    labels = {
        CLOSE_FILTER:'CLOSE_FILTER'
    };

    @api handleRerenderFilter(value){
        if(value){
            const getData = JSON.parse(JSON.stringify(this.filterList));
            this.filterData = this.getModifiedData(getData);
        }   
    }

    connectedCallback() {
        console.log('filterList', this.filterList);
        console.log('isFilter list called');
         console.log('show condition', this.addCondition);
        if(this.filterList === null) {
            this.filterList = [];
        }
        if (this.filterList) {
            const getData = JSON.parse(JSON.stringify(this.filterList));

            
            this.filterData = this.getModifiedData(getData);

        }

    }

    @api updateFilter(value) {
        this.filterData = this.getModifiedData(value);
    }

    getModifiedData(data) {
        console.log('data::::::::',data)
        return data.map((item, index) => {
            return {
                ...item,
                orderNo: index + 1
            }
        })
    }

    handleCloseFilterItem(event) {
        const getIndex = Number(event.currentTarget.dataset.index) + 1;
        this.filterData = this.filterData.filter((item) => item.orderNo != getIndex).map((item, index) => {
            return {
                ...item,
                orderNo: index + 1
            }
        });
        this.dispatchEvent(
            new CustomEvent("updatefilter", {
                detail: { filterData: this.filterData, filterCloseCssClass: this.filterCloseCssClass }
            })
        );
    }

    handleEditFilterItem(event) {
        const getIndex = Number(event.currentTarget.dataset.index) + 1;
        const selectedFilter = this.filterData.filter((item) => item.orderNo === getIndex).map((item, index) => {
            return {
                ...item
            }
        });
        this.dispatchEvent(
            new CustomEvent("editfilter", {
                detail: { selectedFilter }
            })
        );
    }
}