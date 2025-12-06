public class JsonPathParser {

    /**
     * Extract a nested value from JSON using path starting with "!"
     * Example: "!profile.contact.email"
     */
    public static Object getValue(Object jsonData, String path) {
        if(jsonData == null || String.isBlank(path)) return null;

        // Remove optional "!"
        if(path.startsWith('!')) {
            path = path.substring(1);
        }

        List<String> keys = path.split('\\.');
        Object current = jsonData;

        for(String key : keys) {
            if(current == null) return null;

            if(current instanceof Map<String, Object>) {
                Map<String, Object> mapData = (Map<String, Object>) current;
                current = mapData.get(key);
            }
            else if(current instanceof List<Object>) {
                // Key must be numeric index
                Integer idx;
                try {
                    idx = Integer.valueOf(key);
                    current = ((List<Object>) current).get(idx);
                } catch(Exception e) {
                    return null;
                }
            }
            else {
                // Primitive — cannot drill down
                return null;
            }
        }

        return current;
    }
}