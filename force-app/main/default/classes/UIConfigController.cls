public with sharing class UIConfigController {

    // ==========================================================
    // UI CONFIG
    // ==========================================================
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
    // GET DATA (SObject based, not JSON)
    // ==========================================================
    @AuraEnabled
    public static List<Map<String,Object>> getData(
        String dataSourceConfigJson,
        String dataSchemaJson,
        String sortField,
        String sortDir
    ) {
        Map<String,Object> cfg    = (Map<String,Object>)JSON.deserializeUntyped(dataSourceConfigJson);
        Map<String,Object> schema = (Map<String,Object>)JSON.deserializeUntyped(dataSchemaJson);

        String soql = (String)cfg.get('soql');
        if (String.isBlank(soql)) {
            throw new AuraHandledException('SOQL missing in DataSourceConfig__c');
        }

        // Optional sort override
        if (!String.isBlank(sortField)) {
            Integer idx = soql.toUpperCase().indexOf(' ORDER BY ');
            if (idx > 0) {
                soql = soql.substring(0, idx);
            }
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

                if (fieldPath.contains('.')) {
                    row.put(fieldPath, resolveNested(sobj, fieldPath));
                } else {
                    row.put(fieldPath, sobj.get(fieldPath));
                }
            }
            output.add(row);
        }
        return output;
    }

    // Resolve nested relationship fields for SObject-based data
    private static Object resolveNested(Object obj, String path) {
        if (obj == null || path == null) return null;

        List<String> parts = path.split('\\.');
        Object current = obj;
        Boolean valid = true;

        for (Integer i = 0; i < parts.size(); i++) {
            String part = parts[i];

            if (!(current instanceof SObject)) {
                valid = false;
                break;
            }

            SObject sobj = (SObject) current;
            Map<String, Object> pop = sobj.getPopulatedFieldsAsMap();

            Boolean isLast = (i == parts.size() - 1);

            if (isLast) {
                // scalar field
                if (pop.containsKey(part)) {
                    current = pop.get(part);
                } else {
                    valid = false;
                }
            } else {
                // relationship hop
                if (pop.containsKey(part) && pop.get(part) instanceof SObject) {
                    current = sobj.getSObject(part);
                } else {
                    valid = false;
                }
            }

            if (!valid) break;
        }

        if (valid && current != null && !(current instanceof SObject)) {
            return current;
        }
        return null;
    }

    private static String capitalize(String s) {
        return s.left(1).toUpperCase() + s.substring(1);
    }

    // ==========================================================
    // UPDATE (SObject-based)
    // ==========================================================
    @AuraEnabled
    public static void updateRecords(
        String dataSourceConfigJson,
        List<Map<String,Object>> updates
    ) {
        if (updates == null || updates.isEmpty()) return;

        Map<String,Object> cfg = (Map<String,Object>)JSON.deserializeUntyped(dataSourceConfigJson);
        String soql = (String)cfg.get('soql');

        if (String.isBlank(soql)) {
            throw new AuraHandledException('SOQL missing for update');
        }

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

        if (!toUpdate.isEmpty()) {
            update toUpdate;
        }
    }

    // ==========================================================
    // DELETE (SObject-based)
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

    // ==========================================================
    // JSON MAPPING UTIL
    // ==========================================================
    public static List<Map<String,Object>> mapRowsWithSchema(
        List<Object> jsonRows,
        List<String> paths
    ) {
        List<Map<String,Object>> output = new List<Map<String,Object>>();

        for (Object rowObj : jsonRows) {
            Map<String,Object> row    = (Map<String,Object>) rowObj;
            Map<String,Object> result = new Map<String,Object>();

            for (String path : paths) {
                Object value = JsonPathParser.getValue(row, path);
                result.put(path, value);
            }
            output.add(result);
        }
        return output;
    }

    // ==========================================================
    // BUILD UI DATA (for dynamic form) from JSON_Data__c
    // ==========================================================
    @AuraEnabled
    public static List<Map<String,Object>> buildUIData(String dataSchemaJson) {

        // Parse Schema
        Map<String,Object> schema  = (Map<String,Object>)JSON.deserializeUntyped(dataSchemaJson);
        List<Object>       columns = (List<Object>)schema.get('columns');

        // Get JSON from custom object
        String stored = getJSONStore();
        if (String.isBlank(stored)) {
            return new List<Map<String,Object>>();
        }

        List<Object> jsonRows = (List<Object>)JSON.deserializeUntyped(stored);
        List<Map<String,Object>> output = new List<Map<String,Object>>();

        for (Object raw : jsonRows) {
            Map<String,Object> row   = (Map<String,Object>)raw;
            List<Map<String,Object>> rowUI = new List<Map<String,Object>>();

            for (Object colDef : columns) {
                Map<String,Object> col  = (Map<String,Object>)colDef;
                String path             = (String)col.get('fieldName');
                if (String.isBlank(path)) continue;

                Object value = JsonPathParser.getValue(row, path);

                Map<String,Object> field = new Map<String,Object>();
                field.put('label',       col.get('label'));
                field.put('name',        path);
                field.put('placeholder', 'Enter ' + String.valueOf(col.get('label')));
                field.put('value',       value);

                // Flags
                field.put('isSearchable', false);

                if (col.get('type') == 'text') {
                    field.put('isInput', true);
                } else {
                    field.put('isInput', false);
                }

                field.put('isCombobox', false);

                if (col.get('type') == 'textarea') {
                    field.put('isTextarea', true);
                } else {
                    field.put('isTextarea', false);
                }

                if (col.get('type') == 'picklist') {
                    field.put('isMultiSelect', true);
                } else {
                    field.put('isMultiSelect', false);
                }

                field.put('isToggle', false);

                // Constraints
                field.put('type',     col.get('type'));
                field.put('required', col.get('required'));
                field.put('readOnly', col.get('readOnly'));
                field.put('disabled', false);

                // Layout
                field.put('gridSize', 'slds-size_2-of-9 slds-p-horizontal_small');

                rowUI.add(field);
            }

            output.add(new Map<String,Object>{ 'fields' => rowUI });
        }

        return output;
    }

    // ==========================================================
    // GET DATA FROM JSON_Data__c (for table)
    // ==========================================================
    @AuraEnabled
    public static List<Map<String,Object>> getAPIData(String dataSchemaJson) {

        // Deserialize schema
        Map<String,Object> schema  = (Map<String,Object>)JSON.deserializeUntyped(dataSchemaJson);
        List<Object>       cols    = (List<Object>)schema.get('columns');

        // Get JSON from custom object
        String stored = getJSONStore();
        if (String.isBlank(stored)) {
            // No JSON stored yet
            return new List<Map<String,Object>>();
        }

        List<Object> jsonRows = (List<Object>)JSON.deserializeUntyped(stored);
        List<Map<String,Object>> output = new List<Map<String,Object>>();

        for (Object raw : jsonRows) {
            Map<String,Object> rowObj   = (Map<String,Object>)raw;
            Map<String,Object> finalRow = new Map<String,Object>();

            for (Object colDef : cols) {
                Map<String,Object> col = (Map<String,Object>)colDef;
                String path            = (String)col.get('fieldName');
                if (String.isBlank(path)) continue;

                Object value = JsonPathParser.getValue(rowObj, path);
                finalRow.put(path, value);
            }
            output.add(finalRow);
        }
        return output;
    }

    // ==========================================================
    // USERS FOR ASSIGN OWNER
    // ==========================================================
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getAssignableUsers() {
        List<Map<String, String>> results = new List<Map<String, String>>();

        for (User u : [
            SELECT Id, Name
            FROM User
            WHERE IsActive = true
            ORDER BY Name
            LIMIT 200
        ]) {
            Map<String, String> m = new Map<String, String>();
            m.put('label', u.Name);
            m.put('value', String.valueOf(u.Id));
            results.add(m);
        }
        return results;
    }

    // ==========================================================
    // BULK EMAIL
    // ==========================================================
    @AuraEnabled
    public static void sendBulkEmail(List<String> toAddresses, String subject, String body) {
        if (toAddresses == null || toAddresses.isEmpty()) {
            throw new AuraHandledException('No recipients specified.');
        }

        if (String.isBlank(subject)) {
            subject = 'Notification';
        }
        if (String.isBlank(body)) {
            body = ' ';
        }

        List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();

        for (String addr : toAddresses) {
            if (String.isBlank(addr)) continue;

            Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
            email.setToAddresses(new List<String>{ addr });
            email.setSubject(subject);
            email.setPlainTextBody(body);
            emails.add(email);
        }

        if (!emails.isEmpty()) {
            Messaging.sendEmail(emails);
        }
    }

    // ==========================================================
    // JSON STORAGE (Custom Object: JSON_Data__c)
    // ==========================================================
    @AuraEnabled(cacheable=true)
    public static String getJSONStore() {
        try {
            JSON_Data__c rec = [
                SELECT JSON__c
                FROM JSON_Data__c
                WHERE Name = 'AccountData'
                LIMIT 1
            ];
            return rec.JSON__c;
        } catch (Exception e) {
            // No record yet
            return null;
        }
    }

    @AuraEnabled
    public static void saveJSONStore(String updatedJson) {
        if (String.isBlank(updatedJson)) {
            throw new AuraHandledException('Updated JSON cannot be empty');
        }

        JSON_Data__c rec;

        try {
            rec = [
                SELECT Id, JSON__c
                FROM JSON_Data__c
                WHERE Name = 'AccountData'
                LIMIT 1
            ];
        } catch (Exception e) {
            rec = new JSON_Data__c(Name = 'AccountData');
        }

        rec.JSON__c = updatedJson;
        upsert rec;
    }
    
}
