
const fs = require('fs');
const socket = require('socket.io');
const r = require('rethinkdb');
const cors = require('cors');

var app = require('express')();

app.use(cors());
app.options('*', cors());
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
var http = require('http').createServer(app);
var io = socket.listen(http);
var feed;



//app.use(express.json());  
//server = http.Server(app); 
r.connect({ host: 'localhost', port: 28015 }, function(err, conn) {
  if (err) throw err;
  if(conn){
    io.on('connection', socket => {
      console.log("user connected", socket.id);
     
      socket.emit('connected', {
        
      });

      socket.on('login_user', (data) => {
        
        console.log(data);
        const email = data.email;
        const pass = data.password;
        if(email && pass != undefined){
        r.table('UsersTCC').filter({
          "email":email,
          "password": pass
        }).run(conn, function(err, cursor) {
          if (err) throw err;
          cursor.toArray(function(err, result) {
              if (err) throw err;
              console.log(JSON.stringify(result[0]));
              if(result[0] != undefined){
                //if(result[0].password == pass){
                  socket.emit('valid',{
                    id:result[0].id,
                    name:result[0].name,
                    email:result[0].email,
                    password:result[0].password,
                    socketid: socket.id
                  });
                  r.table('Devices').filter({
                    "ownerid": result[0].id
                  }).changes().run(conn, function(err, cursor) {
                    cursor.each(function(err, result){
                      if(err) throw err;
                        socket.emit('device_return_map', result.new_val);
                    });
                  });
                  r.table('UsersTCC').filter({
                    "id": result[0].id
                  }).update({
                    "socket": socket.id
                  }).run(conn, function(err, result) {
                    if(err) throw err;
                    console.log(result);
                  });
              }
              else{
                  socket.emit('invalid');
               }
              
          });
        });
      }
      });

      socket.on('ping_device', (data) => {
        deviceName =  data.deviceName;
        OwnerID = data.OwnerID;
        if(OwnerID != undefined){
          r.table('Devices').filter({
            "name": deviceName,
            "ownerid": OwnerID
          }).run(conn, function(err, cursor){
            if(err) throw err;
            cursor.toArray(function(err, result) {
              if(err) throw err;
              if(result[0] !== undefined){
              
                
                if(io.sockets.adapter.nsp.connected[result[0].socket]!= undefined){
                  console.log('estava conectado');
                  socket.emit('ping_return_true', 
                    result[0]
                  );
                  
                }
                else{
                  socket.emit('ping_return_false', 
                  result[0]
                  );
                }
              }
            });
          });
          
        }
      });

      socket.on('ping_device_map', (data) => {
        deviceName =  data.deviceName;
        OwnerID = data.OwnerID;
        if(OwnerID != undefined){
          r.table('Devices').filter({
            "name": deviceName,
            "ownerid": OwnerID
          }).run(conn, function(err, cursor){
            if(err) throw err;
            cursor.toArray(function(err, result) {
              if(err) throw err;
              if(result[0] !== undefined){
              
                
                if(io.sockets.adapter.nsp.connected[result[0].socket]!= undefined){
                  console.log('estava conectado');
                  socket.emit('ping_return_true_map', 
                    result[0]
                  );
                  
                }
                else{
                  console.log('nao estava conectado');
                }
              }
            });
          });
          
        }
      });

      socket.on('map_connection', (data) => {
        ownerid = data.id;
        if(ownerid != undefined){
          r.table('Devices').filter({
            "ownerid": ownerid
          }).run(conn, function(err, cursor){
            if(err) throw err;
            cursor.toArray(function(err, result){
              if(err) throw err;
              console.log(JSON.stringify(result[0]));
              if(result[0] != undefined){
                socket.emit('device_return', result[0]);
              }
              else{
                socket.emit('device_return_fail');
              }
            });
          });
          
      }
      });
      
      
    

      socket.on('cadastro_device', (data) => {
        var devicename = data.Name;
        var ownername = data.OwnerName;
        var ownerid = data.OwnerID;

        if(ownername && ownerid != undefined){
          r.table('Devices').filter({
            "name": devicename,
            "ownerid": ownerid,
          }).run(conn, function(err, cursor){
            if(err) throw err;
            cursor.toArray(function(err, result){
              if(err) throw err;
              console.log(JSON.stringify(result[0]));
              if(result[0] != undefined){
                socket.emit('device already exists', result[0]);
              }
              else{
                r.table('Devices').insert({
                  name: devicename,
                  ownerid: ownerid,
                  ownername: ownername,
                  coordinates:null
                }).run(conn, function(err){
                  if(err){
                    socket.emit('device not created');
                    throw err;
                  }
                  socket.emit('device created');
                });
              }
            });
          });
        }
      });

      socket.on('get_devices', (data) => {
        OwnerID = data.OwnerID;
        console.log(data);
        if(OwnerID != undefined){
          r.table('Devices').filter({
            "ownerid": OwnerID
          }).run(conn, function(err, cursor) {
            if(err) throw err;
            cursor.toArray(function(err, result) {
              if(err) {
                socket.emit('err');
                throw err;
              }
              if(result != undefined){
                  socket.emit('device_return', result);
              }
              else{
                socket.emit('nothing found');
              }

            });
          });
        }
      });

      socket.on('sync_device', (data) => {
        deviceName = data.Name;
        ownerName = data.ownerName;
        if(deviceName && ownerName != undefined){
        console.log(data);
        r.table('Devices').filter({
          "name": deviceName,
          "ownername": ownerName
        }).run(conn, function(err, cursor){
          if(err) throw err;
          cursor.toArray(function(err, result) {
            if(err) throw err;
            if(result[0] !== undefined){
              socket.emit('sync_return', result[0]);
              r.table('Devices').filter({
                "id": result[0].id
              }).update({
                "socket": socket.id
              }).run(conn, function(err, result) {
                if(err) throw err;
                console.log(result);
              })
            }   
          });
        });
      }
      });

      socket.on('delete_device', (data) => {
        OwnerID = data.OwnerID;
        deviceName = data.Name;

        if(OwnerID != undefined){
          r.table('Devices').filter({
            "name": deviceName,
            "ownerid": OwnerID
          }).delete().run(conn, function(err){
            if(err){
              socket.emit('err');
              throw err;
            }

          });
        }
      });

      socket.on('cadastro_user', (data) => {
        var Name = data.Name;
        var Email = data.Email;
        var Password = data.Password;
        var Tel = data.Tel;
        var CPF = data.CPF;
        console.log(data);
        r.table('UsersTCC').filter(r.row('email').eq(Email)).run(conn, function(err, cursor) {
          if (err) throw err;
          cursor.toArray(function(err, result) {
              if (err) throw err;
              console.log(JSON.stringify(result[0]));
              if(result[0] != undefined) {
                return socket.emit('already exists');
              }
              else {
                r.table('UsersTCC').insert(
                  {
                    name: Name,
                    email: Email,
                    password: Password,
                    tel: Tel,
                    cpf: CPF
                  }
                ).run(conn, function(err){
                  if(err) {
                    socket.emit('not created');
                    throw err;
                  }
                  else {
                  socket.emit('created');
                  }
                });
              }
          });
        });
      });

      socket.on('send_coords', (data) => {
        deviceName = data.Name;
        OwnerID = data.OwnerID;
        coords = data.coords
        console.log(data);
        if(OwnerID != undefined){
          r.table('Devices').filter({
            "name": deviceName,
            "ownerid": OwnerID
          }).update({
            "coordinates": coords
          }).run(conn, function(err, cursor){
            if(err) throw err;
            console.log(cursor);
          });

          
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected!', socket.id);
        socket.removeAllListeners();
      });
    });
  }
});

http.listen(3000, () => {
    console.log("listening on 3000");
})
