const Database = require("./database");
const fs=require('fs');
const express = require('express');
const { Server: SocketServer} = require('socket.io');
const { Server: HttpServer} = require('http');
const messages = require("./messages.json");
const db = new Database;
const path = require("path");
const {MongoConnection} = require("./MongoDB/mongoConnection");
MongoConnection();
const MockContenedor =require('./src/mocks/MockContenedor');
const {normalize, denormalize, schema} = require("normalizr");
const {inspect} =require('util');
const mockContenedor = new MockContenedor;

const MensajesArchivo = require('./src/contenedores/MessageContenedorArchivo');

const mensajesArchivo = new MensajesArchivo;

const MessageContenedorSqlite = require('./src/contenedores/MessageContenedorSqlite');

const messageSqlite = new MessageContenedorSqlite('mensajes');


const Mensajes = require('./src/contenedores/MessageContenedorMongo');

const messageMongo = new Mensajes;

//const productRouter = require('./src/routers/products');
const productMockRouter = require('./src/routers/productsMocks');

const app = express();



app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const httpServer = new HttpServer(app);

const io = new SocketServer(httpServer);



app.use(express.static('public'))

//app.use('/api/products', productRouter);

app.use('/api/productos-test', productMockRouter);
//app.use('/api/productos-tests', express.static(path.resolve(__dirname, 'public/test.html')));

//app.use('/api/productos-testss', express.static(path.join(__dirname, 'public/test.html')));



io.on('connection',  async (socket) => {
    console.log("socket id: ", socket.id);

    socket.emit('products', db.getAll());

    socket.emit('productsMock', mockContenedor.products() );

    const database =  await mensajesArchivo.getAll()

    const authorSchema = new schema.Entity("authors", { idAttribute: (value) => value.id});
    //const valueSchema = new schema.Values(authorSchema)
    /*const textSchema = new schema.Entity("texts");

    const messagesSchema = new schema.Entity("messages", {
        author: authorSchema,
        text: textSchema,
       
      }
      
      ,
      );*/

    function print(objeto) {
        console.log("resultado normalizado",inspect(objeto, false, 12, true))
      }
    
    
    const normalizedMessages = normalize(database, [authorSchema]);
    //print(normalizedMessages)
    const denormalizedMessages = denormalize(normalizedMessages.result, [authorSchema], normalizedMessages.entities);
    //print(denormalizedMessages)

    const arrayNormalizado = Object.values(normalizedMessages.entities.authors)

    console.log("array", arrayNormalizado )
    const longO = JSON.stringify(database).length;


    console.log("Longitud objeto original: ", longO);

    const longN = JSON.stringify(normalizedMessages).length;
    console.log("Longitud objeto normalizado: ", longN);

    const longD = JSON.stringify(denormalizedMessages).length;
    console.log("Longitud objeto desnormalizado: ", longD);

    const porcentajeC = `${((longN * 100) / longO).toFixed(2)} %`
    console.log("Porcentaje de compresión: ", porcentajeC);
    
    socket.emit('conversation', arrayNormalizado);

    socket.emit('compresion',porcentajeC);

    socket.on('new-message', (newMessage)=> {
        console.log({newMessage});
        mensajesArchivo.post(newMessage)
        console.log("mensajes nuevos",   arrayNormalizado)
        io.sockets.emit('conversation', arrayNormalizado);
       

    });

  

    
});





app.get('/', (req, res) => {
    
    
});

app.post('/', (req, res) => {
  console.log(req.body);
  db.save(req.body);
  
  io.sockets.emit('products', db.getAll())

  res.redirect('/');
});


app.get('/productos', (req, res) => {
    res.json(db.getAll());
});


const connectedServer = httpServer.listen(8080, () => {
    console.log(`Servidor Http con Websockets escuchando en el puerto ${connectedServer.address().port}`)
  })
  connectedServer.on('error', error => console.log(`Error en servidor ${error}`))
  

