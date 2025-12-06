public with sharing class UIConfigController {
    
    public static String jsonData = '[{"id":101,"profile":{"company":"ACME Industries","type":"Manufacturing","location":{"city":"Mumbai","country":"India"},"contact":{"phone":"+91-9876543210","email":"sales@acme.com"}}},{"id":102,"profile":{"company":"Globex Corporation","type":"Telecom","location":{"city":"Washington DC","country":"USA"},"contact":{"phone":"+1-202-555-0123","email":"contact@globex.com"}}},{"id":103,"profile":{"company":"Initech","type":"Software","location":{"city":"London","country":"UK"},"contact":{"phone":"+44-20-1234-1111","email":"support@initech.com"}}},{"id":104,"profile":{"company":"Umbrella Corp","type":"Biotech","location":{"city":"Tokyo","country":"Japan"},"contact":{"phone":"+81-3-9999-1111","email":"info@umbrella.co.jp"}}},{"id":105,"profile":{"company":"Wayne Enterprises","type":"Aerospace","location":{"city":"Gotham","country":"USA"},"contact":{"phone":"+1-212-444-0000","email":"corporate@wayne.com"}}},{"id":106,"profile":{"company":"Stark Industries","type":"Defense","location":{"city":"Los Angeles","country":"USA"},"contact":{"phone":"+1-310-555-2200","email":"info@starkindustries.com"}}},{"id":107,"profile":{"company":"Oscorp","type":"BioTech","location":{"city":"New York","country":"USA"},"contact":{"phone":"+1-646-505-0110","email":"contact@oscorp.com"}}},{"id":108,"profile":{"company":"Cyberdyne Systems","type":"AI Research","location":{"city":"San Jose","country":"USA"},"contact":{"phone":"+1-408-555-2099","email":"lab@cyberdyne.ai"}}},{"id":109,"profile":{"company":"Wonka Industries","type":"Food & Confectionery","location":{"city":"Zurich","country":"Switzerland"},"contact":{"phone":"+41-44-404-1000","email":"office@wonka.com"}}},{"id":110,"profile":{"company":"Tyrell Corporation","type":"Robotics","location":{"city":"Los Angeles","country":"USA"},"contact":{"phone":"+1-310-555-9090","email":"info@tyrell-corp.com"}}},{"id":111,"profile":{"company":"Aperture Science","type":"Research","location":{"city":"Detroit","country":"USA"},"contact":{"phone":"+1-313-867-3301","email":"help@aperturesci.com"}}},{"id":112,"profile":{"company":"Hooli","type":"Technology","location":{"city":"San Francisco","country":"USA"},"contact":{"phone":"+1-415-501-1221","email":"info@hooli.com"}}},{"id":113,"profile":{"company":"Pied Piper","type":"Compression","location":{"city":"Palo Alto","country":"USA"},"contact":{"phone":"+1-650-111-1212","email":"dev@piedpiper.com"}}},{"id":114,"profile":{"company":"Nakatomi Trading","type":"Finance","location":{"city":"Tokyo","country":"Japan"},"contact":{"phone":"+81-3-6868-0000","email":"contact@nakatomi.jp"}}},{"id":115,"profile":{"company":"Vandelay Industries","type":"Import/Export","location":{"city":"Boston","country":"USA"},"contact":{"phone":"+1-617-777-1001","email":"sales@vandelay.com"}}},{"id":116,"profile":{"company":"Freeman Labs","type":"Medical Research","location":{"city":"Seattle","country":"USA"},"contact":{"phone":"+1-206-555-2389","email":"lab@freemanlabs.org"}}},{"id":117,"profile":{"company":"Spacely Sprockets","type":"Mechanical","location":{"city":"Houston","country":"USA"},"contact":{"phone":"+1-713-901-0011","email":"sales@spacely.com"}}},{"id":118,"profile":{"company":"Blue Sun Corp","type":"Retail","location":{"city":"Beijing","country":"China"},"contact":{"phone":"+86-10-8800-1234","email":"info@bluesun.cn"}}},{"id":119,"profile":{"company":"Shinra Electric","type":"Energy","location":{"city":"Midgar","country":"Japan"},"contact":{"phone":"+81-3-7777-0000","email":"energy@shinra.jp"}}},{"id":120,"profile":{"company":"Hyperion","type":"Aerospace","location":{"city":"Sydney","country":"Australia"},"contact":{"phone":"+61-2-6001-0001","email":"info@hyperion.com.au"}}},{"id":121,"profile":{"company":"Black Mesa","type":"Research","location":{"city":"New Mexico","country":"USA"},"contact":{"phone":"+1-575-909-4500","email":"queries@blackmesa.gov"}}},{"id":122,"profile":{"company":"LexCorp","type":"Energy","location":{"city":"Metropolis","country":"USA"},"contact":{"phone":"+1-999-900-1200","email":"corp@lexcorp.com"}}},{"id":123,"profile":{"company":"Paper Street Soap Co.","type":"Manufacturing","location":{"city":"Los Angeles","country":"USA"},"contact":{"phone":"+1-213-888-0001","email":"hello@paperstreet.com"}}},{"id":124,"profile":{"company":"Big Kahuna Burger","type":"Food","location":{"city":"Honolulu","country":"USA"},"contact":{"phone":"+1-808-555-0101","email":"orders@bigkahuna.com"}}},{"id":125,"profile":{"company":"Monsters Inc.","type":"Energy","location":{"city":"San Diego","country":"USA"},"contact":{"phone":"+1-619-444-1212","email":"contact@monstersinc.com"}}},{"id":126,"profile":{"company":"Abstergo Industries","type":"Pharma","location":{"city":"Rome","country":"Italy"},"contact":{"phone":"+39-06-900-1111","email":"office@abstergo.org"}}},{"id":127,"profile":{"company":"Rapture Corp","type":"Energy","location":{"city":"Atlantis","country":"Unknown"},"contact":{"phone":"+0-999-000-1111","email":"admin@rapture.co"}}},{"id":128,"profile":{"company":"Vault-Tec","type":"Defense","location":{"city":"Las Vegas","country":"USA"},"contact":{"phone":"+1-702-901-1000","email":"info@vault-tec.com"}}},{"id":129,"profile":{"company":"Dragon Motors","type":"Automobile","location":{"city":"Shanghai","country":"China"},"contact":{"phone":"+86-21-5300-4555","email":"sales@dragonmotors.cn"}}},{"id":130,"profile":{"company":"Atlas Corp","type":"Logistics","location":{"city":"Dubai","country":"UAE"},"contact":{"phone":"+971-4-930-2000","email":"business@atlas.ae"}}}]';

    // Deserialize
    Object parsed = JSON.deserializeUntyped(jsonData);
    
    // Cast to list
    public List<Object> rows = (List<Object>) parsed;

    @AuraEnabled(cacheable=true)
    public static User_Interface_Configuration__c getUIConfig(String name) {
        return [
            SELECT Id, DataSchema__c, DataSourceConfig__c, Active__c
            FROM User_Interface_Configuration__c
            WHERE Name = :name AND Active__c = true
            LIMIT 1
        ];
    }

    // ==========================================================
    // GET DATA
    // ==========================================================
   

    @AuraEnabled
public static List<Map<String,Object>> getData(
    String dataSourceConfigJson,
    String dataSchemaJson,
    String sortField,
    String sortDir
) {
    Map<String,Object> cfg = (Map<String,Object>)JSON.deserializeUntyped(dataSourceConfigJson);
    Map<String,Object> schema = (Map<String,Object>)JSON.deserializeUntyped(dataSchemaJson);

    String soql = (String)cfg.get('soql');
    if (String.isBlank(soql))
        throw new AuraHandledException('SOQL missing in DataSourceConfig__c');

    // Sorting
    if (!String.isBlank(sortField)) {
        Integer idx = soql.toUpperCase().indexOf(' ORDER BY ');
        if (idx > 0) soql = soql.substring(0, idx);
        soql += ' ORDER BY ' + sortField + ' ' + (sortDir == 'desc' ? 'DESC' : 'ASC');
    }

    List<SObject> recs = Database.query(soql);

    List<Map<String,Object>> output = new List<Map<String,Object>>();
    List<Object> cols = (List<Object>)schema.get('columns');

    for (SObject sobj : recs) {
        Map<String,Object> row = new Map<String,Object>();
        row.put('Id', sobj.get('Id'));
        
        for (Object oc : cols) {
            Map<String,Object> col = (Map<String,Object>)oc;
            String fieldPath = (String)col.get('fieldName');
            if (String.isBlank(fieldPath)) continue;

            if (fieldPath.contains('.'))
                row.put(fieldPath, resolveNested(sobj, fieldPath));
            else
                row.put(fieldPath, sobj.get(fieldPath));
        }
        output.add(row);
    }
    return output;
}


    
    private static Object resolveNested(Object obj, String path) {

    if (obj == null || path == null) return null;

    List<String> parts = path.split('\\.');
    Object current = obj;
    Boolean valid = true;

    for (Integer i = 0; i < parts.size(); i++) {

        String part = parts[i];

        // Must always be working with an SObject until the final scalar
        if (!(current instanceof SObject)) {
            valid = false;
            break;
        }

        SObject sobj = (SObject) current;
        Map<String, Object> pop = sobj.getPopulatedFieldsAsMap();

        Boolean isLast = (i == parts.size() - 1);

        // ----------------------------------------------
        // LAST PART (Scalar field like Name, Email, etc.)
        // ----------------------------------------------
        if (isLast) {
            if (pop.containsKey(part)) {
                current = pop.get(part);
            } else {
                valid = false;
            }
        }

        // ----------------------------------------------
        // RELATIONSHIP PART (Owner, Manager, Account, ...)
        // ----------------------------------------------
        else {
            if (pop.containsKey(part) && pop.get(part) instanceof SObject) {
                current = sobj.getSObject(part);
            } else {
                valid = false;
            }
        }

        if (!valid) break;
    }

    // Only return scalar values (not SObjects)
    if (valid && current != null && !(current instanceof SObject)) {
        return current;
    }

    return null;
}

 

    
    private static String capitalize(String s) {
        return s.left(1).toUpperCase() + s.substring(1);
    }

    // ==========================================================
    // UPDATE
    // ==========================================================
    @AuraEnabled
    public static void updateRecords(
        String dataSourceConfigJson,
        List<Map<String,Object>> updates
    ) {
        if (updates == null || updates.isEmpty())
            return;

        Map<String,Object> cfg = (Map<String,Object>)JSON.deserializeUntyped(dataSourceConfigJson);
        String soql = (String)cfg.get('soql');

        if (String.isBlank(soql))
            throw new AuraHandledException('SOQL missing for update');

        String objName = extractObjectName(soql);
        Schema.SObjectType type = Schema.getGlobalDescribe().get(objName);

        List<SObject> toUpdate = new List<SObject>();

        for (Map<String,Object> row : updates) {
            if (!row.containsKey('Id')) continue;

            SObject sobj = type.newSObject((Id)row.get('Id'));

            for (String key : row.keySet()) {
                if (key == 'Id') continue;
                sobj.put(key, row.get(key));
            }
            toUpdate.add(sobj);
        }

        if (!toUpdate.isEmpty()) update toUpdate;
    }

    // ==========================================================
    // DELETE
    // ==========================================================
    @AuraEnabled
    public static void deleteRecords(
        String dataSourceConfigJson,
        Id recordId
    ) {
        if (recordId == null) return;

        Map<String,Object> cfg = (Map<String,Object>)JSON.deserializeUntyped(dataSourceConfigJson);
        String soql = (String)cfg.get('soql');

        String objName = extractObjectName(soql);
        Schema.SObjectType t = Schema.getGlobalDescribe().get(objName);

        delete t.newSObject(recordId);
    }

    private static String extractObjectName(String soql) {
        Integer idx = soql.toUpperCase().indexOf(' FROM ');
        return soql.substring(idx + 6).trim().split(' ')[0];
    }
    
    
    public static List<Map<String,Object>> mapRowsWithSchema(
        List<Object> jsonRows,
        List<String> paths
    ){
        List<Map<String,Object>> output = new List<Map<String,Object>>();
    
        for (Object rowObj : jsonRows) {
            Map<String,Object> row = (Map<String,Object>) rowObj;
            Map<String,Object> result = new Map<String,Object>();
    
            for (String path : paths) {
                Object value = JsonPathParser.getValue(row, path);
                result.put(path, value);
            }
            output.add(result);
        }
    
        return output;
    }
@AuraEnabled
public static List<Map<String,Object>> buildUIData(String dataSchemaJson) {

    // Parse Schema
    Map<String,Object> schema = (Map<String,Object>)JSON.deserializeUntyped(dataSchemaJson);
    List<Object> columns = (List<Object>)schema.get('columns');

    // Parse actual API/DB records
    List<Object> jsonRows = (List<Object>)JSON.deserializeUntyped(jsonData);

    List<Map<String,Object>> output = new List<Map<String,Object>>();

    for (Object raw : jsonRows) {

        Map<String,Object> row = (Map<String,Object>)raw;
        List<Map<String,Object>> rowUI = new List<Map<String,Object>>();

        for (Object colDef : columns) {

            Map<String,Object> col = (Map<String,Object>)colDef;
            String path = (String)col.get('fieldName');

            if (String.isBlank(path)) continue;

            // NOTE: Your JsonPathParser
            Object value = JsonPathParser.getValue(row, path);

            // Construct UI field object
            Map<String,Object> field = new Map<String,Object>();
            field.put('label', col.get('label'));
            field.put('name', path);
            field.put('placeholder', 'Enter ' + String.valueOf(col.get('label')));
            field.put('value', value);

            // Component flags
            field.put('isSearchable', false);
            if(col.get('type') == 'text'){
                field.put('isInput', true);
            }else{
                field.put('isInput', false);
            }
            
            field.put('isCombobox', false);
            
            if(col.get('type') == 'textarea'){
                field.put('isTextarea', true);
            }else{
                field.put('isTextarea', false);
            }
            
            if(col.get('type') == 'picklist'){
                field.put('isMultiSelect', true);
            }else{
                field.put('isMultiSelect', false);
            }
            
            field.put('isToggle', false);

            // Data constraints
            field.put('type', col.get('type'));
            field.put('required', col.get('required'));
            field.put('readOnly', col.get('readOnly'));
            field.put('disabled', false);

            // Layout (optional override)
            field.put('gridSize', 'slds-size_2-of-9 slds-p-horizontal_small');

            rowUI.add(field);
        }

        output.add(new Map<String,Object>{ 'fields' => rowUI });
    }

    return output;
}
    
  
@AuraEnabled
public static List<Map<String,Object>> getAPIData(String dataSchemaJson) {

    // Deserialize schema
    Map<String,Object> schema = (Map<String,Object>)JSON.deserializeUntyped(dataSchemaJson);
    List<Object> cols = (List<Object>)schema.get('columns');

    // Deserialize JSON demo data
    List<Object> jsonRows = (List<Object>)JSON.deserializeUntyped(jsonData);

    List<Map<String,Object>> output = new List<Map<String,Object>>();

    for (Object raw : jsonRows) {

        Map<String,Object> rowObj = (Map<String,Object>)raw;
        Map<String,Object> finalRow = new Map<String,Object>();

        for (Object colDef : cols) {
            Map<String,Object> col = (Map<String,Object>)colDef;
            String path = (String)col.get('fieldName');

            if (String.isBlank(path)) continue;

            Object value = JsonPathParser.getValue(rowObj, path);
            finalRow.put(path, value);
        }

        output.add(finalRow);
    }

    return output;
}







}