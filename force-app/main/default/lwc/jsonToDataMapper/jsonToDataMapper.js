import { LightningElement, track, api } from "lwc";

// import fetchFunctionLibrary from "@salesforce/apex/ICFunctionLibraryController.fetchFunctionLibrary";
// import preLoadJsonEditor from "@salesforce/apex/ICPostmanLWCDSPreloader.preloadJsonPayload";
// import fetchOptions from "@salesforce/apex/ICPostmanLWCDSPreloader.fetchOptions";
// import fetchSobjectOptions from "@salesforce/apex/ICPostmanLWCActionController.searchOptions";
// import fetchLoadOptions from '@salesforce/apex/ICESearchbarController.searchLaodSourceItems';


import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// import filterCondition from '@salesforce/label/c.FILTER_CONDITION';
// import ERROR from '@salesforce/label/c.ERROR';
// import ERROR_MESSAGE from '@salesforce/label/c.ERROR_MESSAGE';
// import DATA_MAPPER_MESSAGE from '@salesforce/label/c.REQUIRES_MAPPING_PATH';


export default class JsonToDataMapper extends NavigationMixin(LightningElement) {
  @track displayValueSelection = [];
  @track selectedPathArray = [];
  @track displaySelectedPath = [];
  @track dataForChildLookUp;
  @track enablePathSuggestions = false;
  @track enableInsertButtonSection = false;
  @track enableSelectedPath = false;
  @track selectedPathValue = '';
  @track lookupOptions;
  @track currentJson;
  @track _jsonOptions;
  @track showSearchField = true;
  @track selectedFieldsArray = [];
  @track showNoDataMapping = true;
  @track jsonEditorData = {};
  @track jsonOptions;
  @track layoutSectionOne = true;
  @track layoutSectionThree = true;
  @track richTextSectionSize = "4";
  @track bodySectionSize = "5";
  @track functionSectionSize = "3";
  @track iconName = "utility:jump_to_left";
  @track functionOptions = [];
  @track categoryOptions = _categoryOptions;
  @track operatorOptions = _operatorOptions;
  @track preLoadOptions = _preLoadOptions;
  @track preLoadOptionsList = _preLoadOptionsList;
  @track etlPreLoadOptionsList = _etlPreLoadOptionsList
  @track radioOptions = _radioOptions;
  @track selectedFunction = "";
  @track rightIconName = "utility:jump_to_right";
  @track objMetadataValues;
  @track selectedDescription;
  @track selectedHelplink = '';
  @track updateEditorData = true;
  @track preloadlookupOptions = [];
  @track selectedPreload;
  @track selectedPreloadVal;
  @track labelName;
  @track isMetadata;
  @track fieldNameVal;
  @track _options;
  @track optionsToDisplay;
  @track functionName;
  @track header = "Create Custom Function";
  @track row = {
    recordId: "",
    functionName: "",
    syntax: "",
    description: "",
    DeveloperName: "",
    className: ""
  };
  @track ischannelName = false;
  @track isChaining = false;
  @track isSobject = false;
  @track isIntegration = false;

  noDataMapping = "Please paste a valid JSON";
  copyLabel = "Copy";
  copyIcon = "utility:copy_to_clipboard";
  showSelectedField;
  dropdownSelector = "display:none";
  disableInput = false;
  valueSelected;
  isClass = true;
  showMapping = false;
  selectedpath = '';

  @api enableInsertButton;
  @api searchId;
  @api targetValue;
  @api isAction;
  @api channelData;
  @api integrationAction;
  @api isEtl = "";
  @api dSourceJson;
  @api transformJson;
  @api isLoad = "";
  @api inputValue = "";
  @api placeHolder = "Select Functions";
  @api filterEnabled;
  @api etlRecord;
  @api order;
  @api sourceDataValue;
  @api isIntegrationheader;
  operatorCss = 'slds-grid slds-grid_vertical-align-center';

  inputData;
  actualJSONData;
  pathConstruct;
  selectedIndex;

  get fullPath() {
    return this.displaySelectedPath.map(item => item.label).join(' > ');
  }
  get isCopyDisable() {
    return this.selectedFieldsArray.length == 1;
  }

  get isWeb() {
    return false;
  }

  get separator() {
    return "/"; //this.isWeb ? '/' : '.'
  }

  get index() {
    return "[1]"; // this.isWeb ? '[1]' : '[0]'
  }

  @track selectedFieldData = { fieldName: this.isWeb ? "/" : "", value: "" };

  @track hideJsonTextEditor = false;
  @api isEtlExtract;

  @api isTransform;

  @api isEtlLoad;

  @api isEtlGlobal;

  connectedCallback() {

    this.enableInsertButtonSection = true;
    this.operatorCss = 'slds-grid_vertical-align-center';
    if (this.connectorValue === 'yes') {
      this.hideJsonTextEditor = true;
      this.preLoadOptionsList = this.preLoadOptionsList.filter((option) => {
        return option.value !== "Integration Channel";
      });
    } else {
      this.hideJsonTextEditor = false;
      this.preLoadOptionsList = this.preLoadOptionsList;
    }

    if (this.isAction) {
      this.popipTitle = "Action Filter";
    } else {
      this.popipTitle = "Data Mapping";
    }
    this.selectedFieldsArray.push({ label: " ", isreferenceField: true });
    // this.getmetaDataFunctions("ALL");

    //Close Modal On Esc Button 
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.handleCloseModal();
      }
    });

    this.showLeftBar = false;
    this.showRightBar = false;
    if (this.isEtlExtract === true || this.isEtlGlobal === 'true') {
      let filteredList = this.etlPreLoadOptionsList.filter((res) => {
        return res.value !== 'Extract JSON' && res.value !== 'Transform JSON' && res.value !== 'Load Source';
      });

      this.etlPreLoadOptionsList = filteredList;
    } else if (this.isTransform === true) {
      let filteredListTransform = this.etlPreLoadOptionsList.filter((res) => {
        return res.value !== 'Transform JSON' && res.value !== 'Load Source';
      });

      this.etlPreLoadOptionsList = filteredListTransform;
    } else if (this.isEtlLoad === true) {
      let filteredListLoad = this.etlPreLoadOptionsList.filter((res) => {
        return res.value !== 'Load Source';
      });

      this.etlPreLoadOptionsList = filteredListLoad;
    }
  }

  isValidJson(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  populateLookupOptions(json) {
    let whichObject = typeof json;
    this.lookupOptions = [];
    if (whichObject == 'string') {
      if (this.isValidJson(json)) {
        json = JSON.parse(json)
        this.showSearchField = true;
      }
      else {
        this.lookupOptions = JSON.parse(JSON.stringify(this.lookupOptions));
        this.showSearchField = false;
        return;
      }
    }
    for (const key in json) {
      this.lookupOptions.push({
        label: key,
        value: key,
        isreferenceField: json[key] == null ? false : typeof json[key] == "object"
      });
    }
    this.lookupOptions = JSON.parse(JSON.stringify(this.lookupOptions));

  }
  updateLookup(jsonData) {
    const json = JSON.stringify(jsonData);
    if (isValidJson(json)) {
      this.currentJson = this.jsonEditorData;
      this.jsonOptions = this.jsonEditorData;
      this.populateLookupOptions(this.jsonEditorData);
      this.showNoDataMapping = false;
    } else {
      this.showNoDataMapping = true;
    }
  }

  handleOptionSelect(event) {
    const slectedOption = event.detail;
    let currentJSON = this.currentJson;
    if (Array.isArray(this.currentJson)) {
      currentJSON = this.currentJson[0];
    } else {
      currentJSON = this.currentJson;
    }
    const selectedField = currentJSON[slectedOption];

    if (typeof selectedField == "object") {
      if (Array.isArray(selectedField)) {
        this.currentJson = selectedField[0];
        this.selectedFieldData.fieldName +=
          slectedOption + this.index + this.separator;
      } else {
        this.currentJson = selectedField;
        this.selectedFieldData.fieldName += slectedOption + this.separator;
      }
      this.populateLookupOptions(this.currentJson);
      //this.showSearchField = true;
      this.showSelectedField = false;
    } else {
      this.showSelectedField = true;
      this.showSearchField = false;
      this.selectedFieldData.fieldName += slectedOption;
    }

    if (this.isWeb && this.selectedFieldData.fieldName.startsWith("/")) {
      this.selectedFieldData.fieldName = "/" + this.selectedFieldData.fieldName;
    }
    this.selectedFieldData.value += slectedOption + this.separator;
    if (!this.selectedFieldData.fieldName.startsWith("/")) {
      this.selectedFieldData.fieldName = "/" + this.selectedFieldData.fieldName; //Added just to prefix with "/"
    }
    this.selectedFieldsArray.push({
      label: slectedOption,
      value: slectedOption,
      isreferenceField: this.showSearchField
    });
  }

  handleCloseModal() {
    this.dispatchEvent(new CustomEvent("close"));
  }

  handleFinalInsert() {
    console.log("finalinsert happened");

    try {
      console.log("going inside try block");

      if (this.isIntegrationheader) {
        let textAreaEditContent = this.template.querySelector('[data-id="textArea"]').value.trim();
        console.log('show the added value', textAreaEditContent);
        console.log("isIntegrationheader", this.isIntegrationheader);

        const messagePayload = {
          valueTobeInserted: textAreaEditContent
        };
        this.dispatchEvent(
          new CustomEvent("inserttoheader", {
            detail: messagePayload
          })
        );
        return;
      }

      let textAreaEditContent = this.template.querySelector('[data-id="textArea"]').value.trim();
      // Supported operators
      let operatorSupporting = ['==', '>', '<', '>=', '<=', '<>', '!=', 'LIKE'];

      // Regex to detect an operator from the allowed list
      const operatorRegex = new RegExp(`\\s*(${operatorSupporting.map(op => op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*`);
      const match = textAreaEditContent.match(operatorRegex);

      if (match) {
        const operator = match[1]; // Extract the matched operator

        // Split the input into operands
        const parts = textAreaEditContent.split(operator).map(part => part.trim());

        // Check for valid operands
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          this.showToast();
          return;
        }

        console.log("show input value", textAreaEditContent);

        // Dispatch event only if filterEnabled is true
        this.dispatchEvent(
          new CustomEvent("insert", {
            detail: {
              inputValue: textAreaEditContent,
              searchId: this.searchId
            }
          })
        );

      } else {
        // Path-only validation
        console.log("show input value", textAreaEditContent);

        if (textAreaEditContent && !this.filterEnabled) {
          this.dispatchEvent(
            new CustomEvent("insert", {
              detail: {
                inputValue: textAreaEditContent,
                searchId: this.searchId
              }
            })
          );
        } else {
          this.isAction ? this.showToast() : this.showDefaultToast();
        }
      }

    } catch (error) {
      console.log('going to catch block', error);
      this.showToast();
      console.error('Error:: ', error);
    }
  }


  showToast() {
    const event = new ShowToastEvent({
      title: 'Alert',
      message: filterCondition,
      variant: 'error'
    });
    this.dispatchEvent(event);
  }
  showDefaultToast() {
    const event = new ShowToastEvent({
      title: 'Mapping Not Found',
      message: DATA_MAPPER_MESSAGE,
      variant: 'error'
    });
    this.dispatchEvent(event);
  }

  handleCopyToClipboard() {
    this.copyLabel = "Copied";
    this.copyIcon = "utility:check";

    const inputElement = this.template.querySelector('[data-id="textArea"]');
    let textAreaEditContent = "";
    if (inputElement && typeof inputElement.value === "string") {
      textAreaEditContent = inputElement.value;
    }
    const textArea = document.createElement("textarea");
    textArea.setAttribute("readonly", "");
    textArea.value = textAreaEditContent || " ";

    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999);

    return new Promise((res, rej) => {
      try {
        const success = document.execCommand("copy");
        success ? res() : rej("Copy failed");
      } catch (err) {
        rej("Clipboard error: " + err.message);
      } finally {
        textArea.remove();
      }
    });
  }


  handleJsonDataChange(event) {
    this.jsonEditorData = event.detail;
    this.updateLookup(this.jsonEditorData);
  }

  handleCloseSideBar(event) {
    if (this.layoutSectionOne && this.layoutSectionThree) {
      this.layoutSectionOne = false;
      this.iconName = "utility:jump_to_right";
      this.bodySectionSize = "9";
      this.showMapping = true;
      this.showLeftBar = true;
    } else if (this.layoutSectionOne && !this.layoutSectionThree) {
      this.layoutSectionOne = false;
      this.iconName = "utility:jump_to_right";
      this.bodySectionSize = "12";
      this.showMapping = true;
      this.showLeftBar = true;
    } else if (!this.layoutSectionOne && this.layoutSectionThree) {
      this.layoutSectionOne = true;
      this.iconName = "utility:jump_to_left";
      this.bodySectionSize = "5";
      this.showMapping = false;
      this.showLeftBar = false;
    } else if (!this.layoutSectionOne && !this.layoutSectionThree) {
      this.layoutSectionOne = true;
      this.iconName = "utility:jump_to_left";
      this.bodySectionSize = "8";
      this.showMapping = false;
      this.showLeftBar = false;
    } else {
      this.layoutSectionOne = true;
      this.iconName = "utility:jump_to_left";
      this.bodySectionSize = "5";
      this.showMapping = false;
      this.showLeftBar = false;
    }
  }

  showFunction = false;
  handleCloseFunction(event) {
    if (this.layoutSectionThree && this.layoutSectionOne) {
      this.layoutSectionThree = false;
      this.rightIconName = "utility:jump_to_left";
      this.bodySectionSize = "8";
      this.showFunction = true;
      this.showRightBar = true;
    } else if (this.layoutSectionThree && !this.layoutSectionOne) {
      this.layoutSectionThree = false;
      this.rightIconName = "utility:jump_to_left";
      this.bodySectionSize = "12";
      this.showFunction = true;
      this.showRightBar = true;
    } else if (!this.layoutSectionThree && this.layoutSectionOne) {
      this.layoutSectionThree = true;
      this.rightIconName = "utility:jump_to_right";
      this.bodySectionSize = "5";
      this.showFunction = false;
      this.showRightBar = false;
    } else if (!this.layoutSectionThree && !this.layoutSectionOne) {
      this.layoutSectionThree = true;
      this.rightIconName = "utility:jump_to_right";
      this.bodySectionSize = "9";
      this.showFunction = false;
      this.showRightBar = false;
    } else {
      this.layoutSectionThree = true;
      this.rightIconName = "utility:jump_to_right";
      this.bodySectionSize = "5";
      this.showFunction = false;
      this.showRightBar = false;
      //this.functionSectionSize = '3';
    }
  }
  handleChangeCategory(event) {
    this.selectedFunction = "";
    let selectedCategory = event.detail.value;
    this.getmetaDataFunctions(selectedCategory);
  }
  handleChangeFunction(event) {
    this.selectedFunction = event.target.inputValue;

    const jsObjects = JSON.parse(JSON.stringify(this.objMetadataValues));
    this.functionName = event.detail.recordId;
    if (typeof jsObjects !== 'undefined' && jsObjects !== null && jsObjects.length > 0) {
      let objectDetail = jsObjects.find((obj) => {
        if (obj.hasOwnProperty("lwapic__Syntax__c")) {
          return obj.lwapic__Syntax__c === event.detail.recordId;
        } else {
          return obj.Syntax__c === event.detail.recordId;
        }
      });
      // getting dynemic each function link from custom metadata
      if (objectDetail.hasOwnProperty("lwapic__Syntax__c")) {
        this.selectedDescription = objectDetail.lwapic__Description__c;
        this.selectedHelplink = objectDetail.lwapic__Help_Link__c;
        // this.selectedHelplink = "https://200ok.gitbook.io/200ok-documents/v/200-ok-user-manual/built-in-functions";
      } else {
        this.selectedDescription = objectDetail.Description__c;
        this.selectedHelplink = objectDetail.Help_Link__c;
        // this.selectedHelplink = "https://200ok.gitbook.io/200ok-documents/v/200-ok-user-manual/built-in-functions";
      }
    }
  }
  handleSelectedFunction(event) {
    this.copyLabel = "Copy";
    this.copyIcon = "utility:copy_to_clipboard";
    let el = this.template.querySelector('[data-id="textArea"]');
    this.insertAtCursor(el, this.functionName);
  }

  async handleConstructPath(data, currentId) {
    try {
      const element = data.find(item => item.id === currentId);

      if (!element) {
        throw new Error(`Element with id ${currentId} not found.`);
      }

      const { reference, label, type } = element;

      // If there's no reference, this is the root element
      if (!reference) {
        return type === "array" ? `/[${label}]` : `/${label}`;
      }

      // Find the parent element based on the last segment of the reference
      const referenceParts = reference.split('/');
      const parentValue = referenceParts.pop();
      const parentElement = data.find(item => item.value == parentValue);

      if (!parentElement) {
        throw new Error(`Parent element for reference "${reference}" not found.`);
      }

      // Recursively construct the parent path
      const parentPath = await this.handleConstructPath(data, parentElement.id);

      // Append the current label to the parent path
      return type === "array"
        ? `${parentPath}[${label}]`
        : `${parentPath}/${label}`;
    } catch (e) {
      console.error('error in function handleConstructPath : ', e.message);
    }
  }


  async handleSelectedJpath(event) {
    try {
      // Ensure you await the result of handleConstructPath
      let responsePathConstruct = this.pathConstruct; //await this.handleConstructPath(this.displaySelectedPath, this.displaySelectedPath[this.displaySelectedPath.length - 1].id);
      let valueOfFieldData = responsePathConstruct.replace(/\[\d+\]/g, "").replace(/^\/|\/$/g, "") + "/";

      this.selectedFieldData.fieldName = responsePathConstruct;
      this.selectedFieldData.value = valueOfFieldData;

      if (this.selectedPreload == "Request Payload") {
        let result = this.selectedFieldData.fieldName.includes("$Request");
        if (!result) {
          this.selectedFieldData.fieldName = '$Request' + this.selectedFieldData.fieldName;
        }
      } else {
        this.selectedFieldData.fieldName = this.selectedFieldData.fieldName;
      }

      if (this.selectedpath == 'Extract JSON' || this.sourceDataValue === '$DS') {
        // this condition is added because $DS is comming Repetitively
        this.selectedFieldData.fieldName = this.selectedFieldData.fieldName.startsWith('$DS') ?
          this.selectedFieldData.fieldName : '$DS' + this.selectedFieldData.fieldName;
        //this.selectedFieldData.fieldName = '$DS' + this.selectedFieldData.fieldName;
      }
      let el = this.template.querySelector('[data-id="textArea"]');
      this.insertAtCursor(el, this.selectedFieldData.fieldName);
    } catch (e) {
      console.error('error in handleSelectedJpath function :', e.message);
    }
  }

  @track dropdownOpen = false;

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) {
      document.addEventListener("click", this.handleOutsideClick);
    } else {
      document.removeEventListener("click", this.handleOutsideClick);
    }
  }

  handleDropdownItemClick(event) {
    this.dropdownOpen = false;
    document.removeEventListener("click", this.handleOutsideClick);
  }

  handleOutsideClick(event) {
    const dropdown = this.template.querySelector(".dropdown");
    if (!dropdown.contains(event.target)) {
      this.dropdownOpen = false;
      document.removeEventListener("click", this.handleOutsideClick);
    }
  }

  get dropdownClass() {
    return this.dropdownOpen ? "dropdown-open" : "dropdown-closed";
  }
  get dropdownClassFalse() {
    return this.dropdownOpen ? "dropdown-open inactive-dropdown" : "dropdown-closed inactive-dropdown";
  }
  get dropdownClassTrue() {
    return this.dropdownOpen ? "dropdown-open dropdown-list" : "dropdown-closed dropdown-list";
  }


  handleSelectedOperator(event) {
    let el = this.template.querySelector('[data-id="textArea"]');
    this.insertAtCursor(el, event.target.getAttribute("data-id"));
    this.dropdownOpen = false;
    document.removeEventListener("click", this.handleOutsideClick);
  }

  insertAtCursor(myField, myValue) {
    try {
      if (!myField || !myValue) {
        return;
      }
      const startPos = myField.selectionStart;
      const endPos = myField.selectionEnd;

      if (startPos !== undefined && endPos !== undefined) {
        myField.value = myField.value.substring(0, startPos) +
          myValue +
          myField.value.substring(endPos);

        const newPos = startPos + myValue.length;
        myField.setSelectionRange(newPos, newPos);
      } else {
        myField.value += myValue;
      }
    }
    catch (error) {
      const event = new ShowToastEvent({
        title: ERROR,
        message: ERROR_MESSAGE,
        variant: ERROR
      });
      this.dispatchEvent(event);
      console.error('error:: ', error.message)
    }
  }

  getmetaDataFunctions(selectedCategory) {
    fetchFunctionLibrary({
      selectedCategory: selectedCategory,
    }).then(resultdata => {
      if (selectedCategory == "ALL") {
        this.objMetadataValues = resultdata;
      }
      if (resultdata.length == 0) {
        this.functionOptions = [];
        return;
      }
      if (resultdata[0].hasOwnProperty("lwapic__Syntax__c")) {
        var functionMapArray = resultdata.map(item => ({
          value: item.lwapic__Syntax__c,
          label: item.lwapic__Function_Name__c,
        }));
      } else {
        var functionMapArray = resultdata.map(item => ({
          value: item.Syntax__c,
          label: item.Function_Name__c,
        }));
      }
      this.functionOptions = functionMapArray;
    });
  }

  handleClosePopup() {
    this.showFunction = false;
  }

  handleSubmitModal() {
    this.showFunction = false;
  }

  showFunctionPopup(e) {
    e.preventDefault();
    this.showFunction = true;
  }

  @api connectorValue;

  renderedCallback() {
    this.connectorValue = this.connectorValue;
    // if()

    // if (this.displayValueSelection.length === 0) {
    //   this.enableInsertButtonSection = true;
    //   this.operatorCss = this.enableSelectedPath ? 'slds-grid_vertical-align-center' : 'slds-grid slds-grid_vertical-align-center';
    // } else if (this.displayValueSelection.length > 0) {
    //   this.enableInsertButtonSection = false;
    //   this.operatorCss = 'slds-grid_vertical-align-center';
    // }
  }

  setChannelOptions(event) {
    try {
      this.isIntegration = false;
      this.selectedPreloadVal = event.target.value;
      this.ischannelName = false;
      this.isMetadata = false;
      this.isChaining = false;
      if (
        this.selectedPreloadVal == "SObject" ||
        this.selectedPreloadVal == "Custom Settings" ||
        this.selectedPreloadVal == "Custom Metadata Types"
      ) {
        this.jsonEditorData = "{}";
        this.showNoDataMapping = true;
        this.isSobject = true;
        fetchSobjectOptions({
          objectApiName: "",
          searchType: this.selectedPreloadVal,
          integrationChannelId: this.connectorValue === 'yes' ? '' : this.channelData.id,
        })
          .then(optionResult => {
            // optionResult.forEach(element => {
            //   optionResult = Object.getOwnPropertyNames(element).sort();
            // });
            var optionMapArray;
            optionMapArray = Object.entries(optionResult[0]).map(([key, value]) => {
              return {
                value: key,
                label: value
              }
            });
            optionMapArray = optionMapArray.filter(element => {
              return !(element.value.includes('App_Settings__c') || element.value.includes('FeatureParameterSettings__c') || element.value.includes('Function_Library__mdt') || element.value.includes('Assistance__mdt'));
            });
            this.preLoadOptions = optionMapArray;
            this.preLoadOptions.sort((a, b) => a.value.localeCompare(b.value));
            this.isIntegration = true;
          })
          .catch(error => {
            this.error = error;

          });
      } else if (this.selectedPreloadVal == "Other Patterns") {
        this.preLoadOptions = _otherPatterns;
        this.isSobject = false;
        this.isIntegration = true;
      }
      else {
        this.preLoadOptions = _preLoadOptions;
        this.isSobject = false;
        this.isIntegration = true;
      }
    } catch (error) {
      console.error('error in setChannelOptions function', error.message);
    }
  }

  setEtlChannelOptions(event) {
    try {
      let selectedJson;
      this.selectedpath = event.target.value;
      if (this.selectedpath === 'Extract JSON' && this.dSourceJson) {
        selectedJson = JSON.parse(this.dSourceJson);
        this.isIntegration = false;
      } else if (this.selectedpath === 'Transform JSON' && this.transformJson) {
        selectedJson = JSON.parse(this.transformJson);
        this.isIntegration = false;
      } else if (this.selectedpath === 'Load Source') {
        this.jsonEditorData = "{}";
        this.showNoDataMapping = true;
        this.isSobject = true;

        fetchLoadOptions({ recordId: this.etlRecord, order: this.order }).then(
          optionResult => {
            var optionMapArray;
            optionMapArray = Object.entries(optionResult).map(([key, value]) => {
              return {
                value: key,
                label: `${key} : ${value}`
              }
            });
            this.preLoadOptions = optionMapArray;
            this.preLoadOptions.sort((a, b) => a.value.localeCompare(b.value));
            this.isIntegration = true;
          }).catch(error => {
            console.error('error in setEtlChannelOptions Load Source', error)
          })
      } else if (this.selectedpath == "SObject" ||
        this.selectedpath == "Custom Settings" ||
        this.selectedpath == "Custom Metadata Types"
      ) {
        this.isIntegration = false;
        this.selectedPreloadVal = event.target.value;
        this.ischannelName = false;
        this.isMetadata = false;
        this.isChaining = false;
        this.jsonEditorData = "{}";


        this.isSobject = true;
        this.connectorValue = 'yes';
        fetchSobjectOptions({
          objectApiName: "",
          searchType: this.selectedpath,
          integrationChannelId: this.connectorValue === 'yes' ? '' : this.channelData.id,
        })
          .then(optionResult => {
            let optionMapArray;
            optionMapArray = Object.entries(optionResult[0]).map(([key, value]) => {
              return {
                value: key,
                label: value
              }
            });
            optionMapArray = optionMapArray.filter(element => {
              return !(element.value.includes('App_Settings__c') || element.value.includes('FeatureParameterSettings__c') || element.value.includes('Function_Library__mdt') || element.value.includes('Assistance__mdt'));
            });
            this.preLoadOptions = optionMapArray;
            this.preLoadOptions.sort((a, b) => a.value.localeCompare(b.value));
            this.isIntegration = true;
          })
          .catch(error => {
            this.error = error;
          });
      } else if (this.selectedpath == "Other Patterns") {
        this.preLoadOptions = _etlOtherPatterns;
        this.isSobject = false;
        this.isIntegration = true;
        this.selectedPreloadVal = 'Other Patterns';
      }

      this.jsonEditorData = selectedJson;
      this.updateLookup(selectedJson);
    } catch (e) {
      console.error('error in setEtlChannelOptions function : ', e.body ? e.body.message : e.message);
    }
  }

  setLookupOptions(event) {
    try {
      this.selectedPreload = event.target.value;

      if (this.selectedPreloadVal !== "Other Patterns") {
        try {
          this.isChaining = false;
          this.preloadlookupOptions = {};
          this.ischannelName = true;
          let optionMapArray = [];
          this.labelName = "";
          this.isMetadata = false;
          if (this.connectorValue === 'yes') {
            optionMapArray = optionMapArray;
          } else if (this.channelData) {
            optionMapArray = [
              { value: this.channelData.name, label: this.channelData.name },
            ];
          }
          this.preloadlookupOptions = optionMapArray;

          if (this.connectorValue !== 'yes') {
            if (this.integrationAction && this.integrationAction.actionType === "Chaining") {
              try {
                this.labelName = "Enter Channel Name";
                this.ischannelName = false;
                this.isChaining = true;

                fetchOptions({ selectedPreload: this.selectedPreload })
                  .then(optionResult => {
                    var optionMapArray;
                    if (optionResult[0].hasOwnProperty("lwapic__Channel_Name__c")) {
                      optionMapArray = optionResult.map(item => ({
                        value: item.lwapic__Channel_Name__c,
                        label: item.lwapic__Channel_Name__c,
                      }));
                    } else {
                      optionMapArray = optionResult.map(item => ({
                        value: item.Channel_Name__c,
                        label: item.Channel_Name__c,
                      }));
                    }
                    this.preloadlookupOptions = optionMapArray;
                  })
                  .catch(error => {
                    this.error = error;
                  });
              } catch (error) {
              }
            }
          }
          if (this.connectorValue !== 'yes') {
            if (this.isChaining === false && this.isSobject === false) {
              preLoadJsonEditor({
                contextName: this.channelData.name,
                selectedPreload: this.selectedPreload,
              })
                .then(presetResult => {
                  if (presetResult) {
                    let resultJson = presetResult;
                    this.jsonEditorData = JSON.parse(JSON.stringify(resultJson));

                    let whichObject = typeof this.jsonEditorData;
                    if (whichObject == "string") {
                      this.jsonEditorData = JSON.parse(this.jsonEditorData);
                    }
                    this.updateLookup(this.jsonEditorData);
                  } else {
                    this.jsonEditorData = "{}";
                  }
                })
                .catch(error => {
                  this.error = error;
                });
            }
          }
          if (this.isSobject === true) {
            if (this.selectedpath === 'Load Source') {
              this.isChaining = false
              this.ischannelName = false;
              this.isMetadata = false;
              const selectedValue = this.preLoadOptions.find(item => item.value === this.selectedPreload)
              const jsonEditor = JSON.parse(selectedValue.value);
              let el = this.template.querySelector('[data-id="textArea"]');
              this.insertAtCursor(el, '$LS' + jsonEditor + '.Id')
            }
            else {
              this.labelName = "Select Field Name";
              this.isChaining = true;
              fetchSobjectOptions({
                objectApiName: this.selectedPreload,
                searchType: "fields",
                integrationChannelId: this.connectorValue === 'yes' ? '' : this.channelData.id,
              })
                .then(optionResult => {
                  this.preloadlookupOptions = Object.entries(optionResult[0]).map(([key, value]) => {
                    return {
                      value: key,
                      label: value
                    }
                  });
                })
                .catch(error => {
                  this.error = error;
                });

            }

            if (this.selectedPreloadVal == "Custom Metadata Types") {
              this.jsonEditorData = "{}";
              this.isMetadata = true;
              fetchSobjectOptions({
                objectApiName: this.selectedPreload,
                searchType: "CustomMdt",
                integrationChannelId: this.connectorValue === 'yes' ? '' : this.channelData.id,
              })
                .then(optionRes => {
                  var optionMapArrayVal;
                  if (Array.isArray(optionRes)) {
                    let arrayOfCustomMetaData = [];
                    optionMapArrayVal = optionRes.map(item => {
                      let val = item;
                      let keysData = Object.keys(val);
                      let valuesData = Object.values(val);

                      keysData.map((res, index) => {
                        let customMetaDataobj = {};
                        customMetaDataobj.value = res;
                        customMetaDataobj.label = valuesData[index];
                        arrayOfCustomMetaData.push(customMetaDataobj);
                      });
                    });
                    optionMapArrayVal = arrayOfCustomMetaData;
                    this.lookupOptions = optionMapArrayVal;
                  } else {
                    // Handle the case where optionRes is not an array
                    this.lookupOptions = [];
                  }
                })
                .catch(error => {
                  this.error = error;
                });
            }
          }
        } catch (error) {
          console.error('error in setLookupOptions function if condition => ', error.message);
        }
      } else {
        let el = this.template.querySelector('[data-id="textArea"]');
        this.insertAtCursor(el, this.selectedPreload);
      }
    } catch (e) {
      console.error('error in setLookupOptions function ', error.message);
    }
  }

  handlePreLoadInput(event) {
    let contextName = event.detail.inputValue;
    this.fieldNameVal = event.detail.inputValue;
    let el = this.template.querySelector('[data-id="textArea"]');
    if (
      this.selectedPreloadVal == "SObject" ||
      this.selectedPreloadVal == "Custom Settings"
    ) {
      if (
        this.selectedPreload == "User" ||
        this.selectedPreload == "Organization"
      ) {
        this.insertAtCursor(
          el,
          "{!$" + this.selectedPreload + "." + contextName + "}"
        );
      } else if (this.selectedPreloadVal == "Custom Settings") {
        this.insertAtCursor(
          el,
          "{!$Setup." + this.selectedPreload + "." + contextName + "}"
        );
      } else {
        this.insertAtCursor(el, "{!" + contextName + "}");
      }
    } else {
      preLoadJsonEditor({
        contextName: contextName,
        selectedPreload: this.selectedPreload,
      })
        .then(presetResult => {
          if (presetResult) {
            let resultJson = presetResult;
            this.jsonEditorData = JSON.parse(JSON.stringify(resultJson));
            let whichObject = typeof this.jsonEditorData;
            if (whichObject == "string") {
              this.jsonEditorData = JSON.parse(this.jsonEditorData);
            }
            this.updateLookup(this.jsonEditorData);
          } else {
            this.jsonEditorData = "{}";
          }
        })
        .catch(error => {
          this.error = error;
        });
    }
  }
  handleSelectedpattern(event) {
    let contextNameVal = event.target.value;
    let el = this.template.querySelector('[data-id="textArea"]');
    this.insertAtCursor(
      el,
      "{!$CustomMetadata." +
      this.selectedPreload +
      "." +
      contextNameVal +
      "." +
      this.fieldNameVal +
      "}"
    );
  }

  handleFetchJsonData(event, reference) {
    try {
      let refVal = '';

      if (event.detail) {
        this.inputData = event.detail;
        this.actualJSONData = event.detail;
        refVal = '';
      } else {
        this.inputData = event;
        refVal = reference;
      }

      this.displayValueSelection = [];

      if (Array.isArray(this.inputData)) {
        for (let i = 0; i < this.inputData.length; i++) {
          let checkObjectType = typeof (this.inputData[i]) == 'object' ? true : false;

          let selectedObj = {};
          // selectedObj.id = i;
          selectedObj.label = i + 1;
          selectedObj.value = i;
          selectedObj.type = 'array';
          selectedObj.reference = refVal;
          selectedObj.isObject = checkObjectType;

          this.displayValueSelection.push(selectedObj);
        }
      } else if (!Array.isArray(this.inputData) && typeof (this.inputData) == 'object') {
        for (const key in this.inputData) {
          let checkObjectType = typeof (this.inputData[key]) == 'object' ? true : false;

          let objData = {};
          // objData.id = key;
          objData.label = key;
          objData.value = key;
          objData.type = 'object';
          objData.reference = refVal;
          objData.isObject = checkObjectType;

          this.displayValueSelection.push(objData);
        }
      }
      this.enablePathSuggestions = true;

      this.dataForChildLookUp = this.displayValueSelection.map((item, index) => ({
        label: item.label,
        value: index,
        isreferenceField: item.isObject
      }));
    } catch (e) {
      console.error('error in handleFetchJsonData : ', e.message);
    }
  }

  async handleOptionSelect(event) {
    try {
      let dataSetIndexData = event.detail;
      let dataSetPath = this.displayValueSelection[dataSetIndexData].value;
      let dataSetPathReference = this.displayValueSelection[dataSetIndexData].reference;

      await this.handleSelectedPath(dataSetIndexData, dataSetPath, dataSetPathReference);
    } catch (error) {
      console.error("error in handleOptionSelect function :", error.message);
    }
  }

  async handleSelectedPath(dataSetIndexData, dataSetPath, dataSetPathReference) {
    try {
      this.selectedIndex = dataSetIndexData;
      let pathResponse = this.displayValueSelection[this.selectedIndex];
      pathResponse.id = this.displaySelectedPath.length + 1;
      this.displaySelectedPath.push(pathResponse);
      this.selectedPathArray.push(dataSetPath);

      this.selectedPathValue = dataSetPath;

      if (pathResponse.type === "array") {
        this.pathConstruct = this.pathConstruct
          ? `${this.pathConstruct}[${parseInt(this.selectedPathValue) + 1}]`
          : `[${parseInt(this.selectedPathValue) + 1}]`;
      } else {
        this.pathConstruct = this.pathConstruct
          ? `${this.pathConstruct}/${this.selectedPathValue}`
          : `/${this.selectedPathValue}`;
      }

      //this.pathConstruct = this.pathConstruct == undefined ? `${this.selectedPathValue}` : `${this.pathConstruct}/${this.selectedPathValue}`;
      let filterInputData = this.inputData[this.selectedPathValue];
      this.displayValueSelection = [];

      if (Array.isArray(filterInputData)) {
        for (let i = 0; i < filterInputData.length; i++) {
          let checkObjectType = typeof (filterInputData[i]) == 'object' ? true : false;

          let selectedObj = {};
          // selectedObj.id = i;
          selectedObj.label = i + 1;
          selectedObj.value = i;
          selectedObj.type = 'array';
          selectedObj.reference = this.pathConstruct;
          selectedObj.isObject = checkObjectType;

          this.displayValueSelection.push(selectedObj);
        }
      } else if (!Array.isArray(filterInputData) && typeof (filterInputData) == 'object') {
        for (const key in filterInputData) {
          let checkObjectType = typeof (filterInputData[key]) == 'object' ? true : false;

          let selectDataObj = {};
          // selectDataObj.id = key;
          selectDataObj.label = key;
          selectDataObj.value = key;
          selectDataObj.type = 'object';
          selectDataObj.reference = this.pathConstruct;
          selectDataObj.isObject = checkObjectType;

          this.displayValueSelection.push(selectDataObj);
        }
      }
      this.inputData = filterInputData;

      if (this.displaySelectedPath.length > 0) this.enableSelectedPath = true;
      else if (this.displaySelectedPath.length === 0) this.enableSelectedPath = false;

      this.dataForChildLookUp = this.displayValueSelection.map((item, index) => ({
        label: item.label,
        value: index,
        isreferenceField: item.isObject
      }));
    } catch (e) {
      console.error('error in handleSelectedPath : ', e.message);
    }
  }

  handleClickSelectedPath = (event) => {
    let clickedPathId = event.currentTarget.dataset.idvalue;
    this.displaySelectedPath.splice(clickedPathId - 1);
    let clickedReferenceValue = event.currentTarget.dataset.valuename;
    this.pathConstruct = clickedReferenceValue;

    if (clickedReferenceValue.length > 0) {
      let clickedPathValue = clickedReferenceValue.includes('/') ? clickedReferenceValue.split('/') : [`${clickedReferenceValue}`];
      let response = clickedPathValue.reduce((acc, key) => {
        return acc ? acc[key] : undefined;
      }, this.actualJSONData);
      this.inputData = response;
    } else {
      this.inputData = this.actualJSONData;
    }

    this.handleFetchJsonData(this.inputData, clickedReferenceValue);
  }
}

const isValidJson = jsonString => {
  try {
    JSON.parse(jsonString);
  } catch (e) {
    return false;
  }
  return true;
};


// not required
var _categoryOptions = [
  {
    label: "All",
    value: "ALL",
  },
  {
    label: "Date & Time",
    value: "Date & Time",
  },
  {
    label: "Math",
    value: "Math",
  },
  {
    label: "Text",
    value: "Text",
  },
  {
    label: "Logical",
    value: "Logical",
  },
  {
    label: "Advanced",
    value: "Advanced",
  },
  {
    label: "Custom",
    value: "Custom",
  },
  {
    label: "DataWeave",
    value: "DataWeave",
  }
];


// not required
var _preLoadOptions = [
  {
    label: "Request Payload",
    value: "Request Payload",
  },
  {
    label: "Response",
    value: "Response",
  },
];
//required
var _preLoadOptionsList = [
  {
    label: "SObject",
    value: "SObject",
  },
  {
    label: "Global Variables",
    value: "Other Patterns",
  },
];


// not required
var _etlPreLoadOptionsList = [
  {
    label: "Extract JSON",
    value: "Extract JSON",
  },
  {
    label: "Transform JSON",
    value: "Transform JSON",
  },
  {
    label: "Load Items",
    value: "Load Source",
  }, {
    label: "SObject",
    value: "SObject",
  },
  {
    label: "Custom Settings",
    value: "Custom Settings",
  },
  {
    label: "Custom Metadata Types",
    value: "Custom Metadata Types",
  },
  {
    label: "Global Variables",
    value: "Other Patterns",
  },
]


// not required

var _radioOptions = [
  {
    label: "Request Payload",
    value: "Request Payload",
  },
  {
    label: "Response",
    value: "Response",
  },
];


// not required

var _otherPatterns = [
  {
    label: "Record Id",
    value: "{!$RecordId}",
  },
  {
    label: "Job Id",
    value: "{!$JobId}",
  },
  {
    label: "Index Pattern",
    value: "{0}",
  },
  {
    label: "User",
    value: "{!$User.Name}",
  },
  {
    label: "Organization",
    value: "{!$Organization.Name}",
  },
  {
    label: "Status Code",
    value: "{!$StatusCode}",
  },
  {
    label: "Parent Request",
    value: "{!$REQUEST.ChannelName}",
  },
  {
    label: "Parent Response",
    value: "{!$RESPONSE.ChannelName}",
  },
  {
    label: "Parent Request Header",
    value: "{!$REQUESTHEADER.ChannelName}",
  },
  {
    label: "Parent Response Header",
    value: "{!$RESPONSEHEADER.ChannelName}",
  },
  {
    label: "Parent Param",
    value: "{!$PARAM.ChannelName}",
  },
  {
    label: "Parent Custom Parameter",
    value: "{!$MAPPING_JSON.ChannelName}",
  }
];

var _etlOtherPatterns = [
  {
    label: "User",
    value: "{!$User.Name}",
  },
  {
    label: "Organization",
    value: "{!$Organization.Name}",
  }
];

var _operatorOptions = [
  {
    label: " == ",
    value: " == "
  },
  {
    label: " > ",
    value: " > "
  },
  {
    label: " < ",
    value: " < "
  },
  {
    label: " <= ",
    value: " <= "
  },
  {
    label: " <> ",
    value: " <> "
  },
  {
    label: " != ",
    value: " != "
  },
  {
    label: " LIKE ",
    value: " LIKE "
  }
];