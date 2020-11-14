//Required global variables for operations of this server
var MY_MAIN_PORT = 5000;
var MY_HOST_IP = '127.0.0.1';
var SERVER_NAME = 'PATIENTS DATA REST API';

//Libraries needed for use, http for req/resp calls and mongoose for DATABASE
var http = require('http');
var mongoose = require('mongoose');

//Fetch port number and IP from environment variables if there is one and store in variables
var port = process.env.MY_MAIN_PORT;
var ipAddress = process.env.MY_HOST_IP;

//Fetch URI from environment variable if there is one OR just use one provided
//Connect to localhost if no other database is found to connect to
var uriString = 
  process.env.MONGODB_URI || 
  'mongodb://127.0.0.1:27017/data';

//Use Async Connection to connect to MongoDB 
mongoose.connect(uriString, {useNewUrlParser: true});  

//Store a connection made to Mongo in a variable for further use
const dbConnectionReady = mongoose.connection;

//If error occurred while making a connection to mongoose above, print error on console
dbConnectionReady.on('Error', console.error.bind(console, 'Unable to Connect'));

//If DB connection opened successfully, print a confirmation message 
dbConnectionReady.once('open', function(){
    console.log("**************************************************************");
    console.log("Welcome to: " + SERVER_NAME);
    console.log("You are now connected to MongoDB at: " + uriString);
    console.log("**************************************************************");
});


//Define the model for my database to store in Mongoose or MongoDB cloud form
var patientDBModel = new mongoose.Schema({
  //Set all my data fields to have string values
        Name       : String,
        Age             : String,
        Gender        : String,
        ReasonForVisit       : String,
        Condition    : String,
        BloodGroup   : String,
        Allergy   : String
});

//Create the DB-Model in mongoose defined above and store it with table name Patients
var PatientModel = mongoose.model('Patients', patientDBModel);

//Import restify, os and restify-errors libraries
var errors = require('restify-errors');
var restify = require('restify');
const { type } = require('os');

//Create my restify server and pass in name I gave
myServer = restify.createServer({ name : SERVER_NAME});

//Check if ip and port number was not found in environment variables and assign default values
if(typeof ipAddress === "undefined"){
  console.warn('No process.env.IP var, using default: ' + MY_HOST_IP);
		ipAddress = MY_HOST_IP;
};
if (typeof port === "undefined") {
  console.warn('No process.env.PORT var, using default port: ' + MY_MAIN_PORT);
  port = MY_MAIN_PORT;
};

//Start the restify server with port and ip set
myServer.listen(port, ipAddress, function(){
  console.log("This server is listening at: "+MY_HOST_IP+":"+MY_MAIN_PORT);
  console.log("**************************************************************");
  console.log("THIS SERVERS OFFERS ENDPOINTS/ACTIONS BELOW")
  console.log("List all Patients: GET")
  console.log("http://127.0.0.1:5000/patients")
  console.log(" Find a Patient by id: GET")
  console.log("http://127.0.0.1:5000/patients/id")
  console.log("Find a Patient by Name, Phone# OR Doctors name: POST")
  console.log("http://127.0.0.1:5000/patients/search")
  console.log("Delete a patient by id: DEL")
  console.log("http://127.0.0.1:5000/patients/id")
  console.log("Update a patient by id: PUT")
  console.log("http://127.0.0.1:5000/patients/id")
  console.log("Create new patient, POST")
  console.log("http://127.0.0.1:5000/patients/JSON_FORMAT_DATA_ATTACHED_WITH_BODY")
  console.log("Find All critical patients, type call = GET")
  console.log("http://127.0.0.1:5000/patients/critical")
});

  //Enable POST REQ for this server
  myServer.use(restify.plugins.fullResponse());

  //Map req.params and req.body so we can fetch params from body of Post Request
  myServer.use(restify.plugins.bodyParser())

//---------------------  SERVER RESOURCES   ----------------------------------
  
  //1. LIST ALL PATIENTS IN DB: REQ METHOD TYPE : GET
  //Get all patients
  myServer.get('/patients', function (req, resp, next) {
    console.log('GET request: Coming in for list of all patients');
    // Find all patients in our database
    PatientModel.find({}).exec(function (error, result) {
      if (error) return next(new Error(JSON.stringify(error.errors)))
      resp.send(result);
    });
  });//end of get all patients

  //2. INSERT NEW PATIENT INTO DB: REQ METHOD TYPE : POST
  myServer.post('/patients', function (req, resp, next){
    console.log("POST request: Coming in to insert a new patient");

    //Check all params attached in body to make sure they are type String not undefined
    if (req.body.Name        === undefined  ||
        req.body.Age              === undefined  ||
        req.body.Gender         === undefined  ||
        req.body.ReasonForVisit        === undefined  ||
        req.body.Condition    === undefined  ||
        req.body.BloodGroup    === undefined  ||
        req.body.Allergy    === undefined 
      ) {
      // If undefined data found, send back an Error message
      return next(new errors.BadRequestError('Error with sent data, Please check JSON parameters'))
    }else{

      //Make a new Obj of Patient Model and Assign values from POST params to all fields
      var patientObj = new PatientModel({
        Name       : req.body.Name,
        Age             : req.body.Age,
        Gender        : req.body.Gender,
        ReasonForVisit       : req.body.ReasonForVisit,
        Condition    : req.body.Condition,
        BloodGroup   : req.body.BloodGroup,
        Allergy   : req.body.Allergy
      });
      
      // Create the patient and saving to db
      patientObj.save(function (error, result) {
      // If there are any errors, pass them to next in the correct format
      if (error) return next(new Error(JSON.stringify(error.errors)))
      // Send the patient if no issues
      resp.send(201, result)
    })
    }//Else ends
  });//Create new patient method ends

   //3. SEARCH A PATIENT BY ID: REQ METHOD TYPE : GET/:ID
   myServer.get('/patients/:id', function(req, resp, next){
     console.log("Get request: coming in to search by id: " + req.params.id);

     //Find the patient by id match in the database
     PatientModel.find({ _id : req.params.id}).exec(function (error, resultFound){

      //If patient found, send back resp
      if(resultFound){
        resp.send(resultFound);
      }else{
        //Send back error 404 code
        resp.send(404);
        console.log(error);
      }
     });
   });//Find by id ends

//4. SEARCH A PATIENT BY NAMES, PHONE OR FAMILY DOCTOR: REQ METHOD TYPE POST : /SEARCH
myServer.post('/patients/search', function(req, resp, next){
  console.log("POST request: coming in to search by name, phone number or family doctor");

  //Use OF ELSE/IF to analyze which param USER is sending to us to search patients with
  if(req.body.Name){
    //Find the patient by first name in the database
    PatientModel.find({ Name: req.body.Name}).exec(function (error, resultFound){
    //If patient found, send back resp
    if(resultFound){
      resp.send(resultFound);
    }else{
      //Send back error 404 code
      resp.send(404);
    }
   });
  }
});//Find by name, phone or doctor ends

//5. DELETE A PATIENT BY ID: REQ TYPE DEL 
myServer.del('/patients/:id', function(req,resp, next){
    console.log("Delete request : Coming in, Delete patient by ID ");

    //Use of .remove() method of restify
    PatientModel.remove({_id: req.params.id}, function(error, deletedPatient){
      //Catch error
      if(error){
          return next(new Error(JSON.stringify(error.errors)));
          console.log("Something went wrong");
      }else{
        //Send back ok code and a message to user
        resp.send(200)
        console.log("Patient Deleted Successfully");
      }
    });
});//Delete by id ends

//6. UPDATE A PATIENT BY ID: REQ TYPE PUT
myServer.put('/patients/:id', function(req, resp, next){
  console.log("Update request : Coming in, patient by ID ")
      
  //Use a new model called tempPatientModel to find correct patient by ID and store it inside 
      PatientModel.findById(req.params.id, function(err, tempPatientModel) {

        if (err)
            resp.send(err);
        //Start placing values from body of request to the tempPatientModel
        tempPatientModel.Name       = req.body.Name,
        tempPatientModel.age             = req.body.age,
        tempPatientModel.Gender        = req.body.Gender,
        tempPatientModel.ReasonForVisit       = req.body.ReasonForVisit,
        tempPatientModel.Condition    = req.body.Condition,
        tempPatientModel.BloodGroup   = req.body.BloodGroup,
        tempPatientModel.Allergy   = req.body.Allergy

        //Now Lets save our tempPatientModel into the database...
        tempPatientModel.save(function(err) {
            if (err)
                resp.send(err);
            //If no errors send back a response to user
            resp.json({ message: 'Patient Updated' });
        });
    });
  });//Update patient by id ends

//7. LIST ALL PATIENTS WITH CRITICAL CONDITION
myServer.get('/patients/critical', function (req, resp, next) {
  console.log('FIND ALL PATIENTS WITH CRITICAL MEDICAL READINGS:');
  //String variable defining critical points coming in on console
  var conditions= "Blood pressure less than 80   OR > 130 is CRITICAL " + "\n"+
                  "Heartbeat rate less than 60   OR > 100 is CRITICAL " + "\n"+
                  "Respiratory rate less than 12 OR > 25 is CRITICAL " + "\n"+
                  "Blood Oxygen Level rate less than 90 is CRITICAL " + "\n";
  console.log(conditions);
  
  // Find all patients in our database
  PatientModel.find({}).exec(function (error, result) {
    //Catch errors
   if (error) return next(new Error(JSON.stringify(error.errors)))
   //If no errors, make a new JSON obj to start storing patient info in
   var criticalPatients = [];
   for(var i = 0; i < result.length; i++) {
    var obj = result[i];
          //Validation to fetch out critical patients
          if((obj.BloodPressure < 80 || obj.BloodPressure > 130)   ||
            (obj.RespiratoryRate < 60 || obj.RespiratoryRate > 100)    ||
            (obj.BloodOxygenLevel < 12 || obj.BloodOxygenLevel > 25) ||
            (obj.HeartbeatRate < 90 || obj.HeartbeatRate > 130) 
            ){
          
            //Push critical patients into temp JSON object to send back to user
            criticalPatients.push(
              {
                _id             : obj.id,
                Name       : obj.Name,
                Age             : obj.Age,
                Gender        : obj.Gender,
                ReasonForVisit       : obj.ReasonForVisit,
                Condition    : obj.Condition,
                BloodGroup   : obj.BloodGroup,
                Allergy   : obj.Allergy,
              }
            );
          }//If statement ends
    }//For loop ends 
  //Send back all patients with critical readings...
  resp.send(criticalPatients)
  });
});//end of get all patients

//**************************** END OF SERVER *******************************/
