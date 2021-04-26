//importar los módulos necesarios
const http = require("http");
const querystring = require("querystring");
const MongoClient = require("mongodb").MongoClient;
//configuración de mongodb
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
const dbName = "my_database";
const url = "mongodb://localhost:27017";
//crear instancia de mongo
const client = new MongoClient(url, mongoOptions);
//definir puerto para el servidor
const port = 3000;
//crear servidor
const server = http.createServer((req, res) => {
  //gestionar respuesta a otro tipos de peticiones que no sean POST
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "text/html");
    res.write("Error: That method is not allowed");
    res.end();
    return;
  } else if (req.method === "POST") {
    //aquí recogemos los datos de la petición que vienen en trozos
    let body = [];
    // recoger los trozos de la petición en un array
    req.on("data", (chunk) => {
      body.push(chunk);
    });
    // cuando se termina de recibir la petición, usamos los datos
    // recogidos en body para meter datos en la bbdd
    req.on("end", () => {
      // convertir cuerpo en string y parsear para sacar parámetros/valores usables
      body = Buffer.concat(body).toString();
      const requestData = querystring.parse(body);
      //conectar a la base de datos
      client
        .connect()
        .then(async () => {
          // referencia a la bbdd
          const database = client.db(dbName);
          // referencia a la colección dentro de la bbdd
          const collection = database.collection("users");
          //meter datos nuevos
          const insertRecord = await collection.insertOne(requestData);
          console.log("Resultado de la inserción: ", insertRecord.result);
          //coger todos los usuarios en la base de datos
          const responseBody = await collection.find({}).toArray();
          client.close();
          //configurar respuesta para devolver todos los usuarios de la bbdd
          console.log("All users: ", responseBody);
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/plain");
          res.write(JSON.stringify(responseBody));
          //para devolver los datos de otra forma:
          //res.write(returnResultsHtml(responseBody));
          res.end();
        })
        //manejar posibles errores
        .catch((error) => {
          console.log(error);
          res.statusCode = 400;
          res.end(`{"error":"Problem connecting to database"}`);
          client.close();
        });
    });
  }
});
// para que el servicio permanezca a la espera de peticiones
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

//función que coge los datos devueltos por la bbdd y los imprime en una lista
function returnResultsHtml(results) {
  let stringOfUserDetails = "";
  for (let index = 0; index < results.length; index++) {
    const element = results[index];
    stringOfUserDetails += `User ${index + 1} is ${element["name"]}`;
    stringOfUserDetails += ` whose phone number is ${element["phone"]}\n`;
  }
  return stringOfUserDetails;
}
