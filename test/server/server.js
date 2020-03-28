express = require("express");
swaggerUi = require('swagger-ui-express'),
swaggerDocument = require('../dist/swagger.json');

app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
