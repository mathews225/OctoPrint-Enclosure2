$(function() {
    function Enclosure2ViewModel(parameters) {
        var self = this;

        self.pluginName = "enclosure2";

        self.global_settings = parameters[0];
        self.connection = parameters[1];
        self.printerStateViewModel = parameters[2];

        self.temperature_reading = ko.observableArray();
        self.temperature_control = ko.observableArray();
        self.rpi_outputs = ko.observableArray();
        self.rpi_inputs = ko.observableArray();
        self.filamentSensorGcode = ko.observable();

        self.enclosure2Temp = ko.observable();
        self.enclosure2SetTemperature = ko.observable();
        self.enclosure2Humidity = ko.observable();


        self.previousGpioStatus;
        self.previousGpioPWMStatus;
        self.navbarTemp= ko.observable();
        self.navbarHum= ko.observable();

        self.showTempNavbar= ko.observable();

        self.notificationProvider = ko.observable();
        self.event_name = ko.observable();
        self.apiKEY = ko.observable();
        self.notifications = ko.observable();

        self.onDataUpdaterPluginMessage = function(plugin, data) {
             if (plugin != "enclosure2") {
                return;
            }

            if (data.hasOwnProperty("enclosure2temp")) {
                self.enclosure2Temp(data.enclosure2temp);


                self.temperature_reading().forEach(function(element) {
                  if("useFahrenheit" in element ){
                    useFahrenheit = element['useFahrenheit']()

                    if(useFahrenheit){
                      self.navbarTemp(_.sprintf("Enc: %.1f&deg;F", data.enclosure2temp));
                    }else{
                      self.navbarTemp(_.sprintf("Enc: %.1f&deg;C", data.enclosure2temp));
                    }
                  }
                });
            }
            if (data.hasOwnProperty("enclosure2Humidity")) {
                self.enclosure2Humidity(data.enclosure2Humidity);
                self.navbarHum(_.sprintf("Hum: %.1f%%", data.enclosure2Humidity));
            }

            if (data.hasOwnProperty("enclosure2SetTemp")){
                if (parseFloat(data.enclosure2SetTemp)>0.0){
                  $("#enclosure2SetTemp").attr("placeholder", data.enclosure2SetTemp);
                }else{
                  $("#enclosure2SetTemp").attr("placeholder", "off");
                }
            }

            if(!data.rpi_output){
              data.rpi_output = self.previousGpioStatus;
            }

            if(!data.rpi_output_pwm){
              data.rpi_output_pwm = self.previousGpioPWMStatus;
            }

            if(data.rpi_output){
              data.rpi_output.forEach(function(gpio) {
                  key = Object.keys(gpio)[0];
                  if(gpio[key]){
                    $("#btn_off_"+key).hide();
                    $("#btn_on_"+key).addClass('active');
                  }
                  else{
                    $("#btn_off_"+key).addClass('active');
                    $("#btn_on_"+key).hide();
                  }

                  // Petes Code //
                  $("#btn_off_"+key).toggle();
                  $("#btn_on_"+key).toggle();

                  // End of Pete //

              });
              self.previousGpioStatus = data.rpi_output;
            }



            // Petes Code //
           if(data.rpi_output){
             data.rpi_output.forEach(function(gpio) {
                 key = Object.keys(gpio)[0];
                 if(gpio[key]){
                   $("#togg_btn_"+key).innerHTML('Off');
                 }
                 else{
                   $("#togg_btn_"+key).innerHTML('On');
                 }
             });
             self.previousGpioStatus = data.rpi_output;
           }
            // End of Pete //

            if(data.rpi_output_pwm){
              data.rpi_output_pwm.forEach(function(gpio) {
                  key = Object.keys(gpio)[0];
                  val = gpio[key];
                  if (parseFloat(val)!=100){
                    $("#dutycycle_"+key).attr("placeholder", val);
                  }else{
                    $("#dutycycle_"+key).attr("placeholder", "off");
                  }
              });
              self.previousGpioPWMStatus = data.rpi_output_pwm;
            }

            if (data.isMsg) {
                new PNotify({title:"Enclosure2", text:data.msg, type: "error"});
            }
        };

        self.enableBtn = ko.computed(function() {
            // return self.connection.loginState.isUser() && self.printerStateViewModel.isOperational();
            return self.connection.loginState.isUser();
        });

        self.onBeforeBinding = function () {
            self.settings = self.global_settings.settings.plugins.enclosure2;
            self.temperature_reading(self.settings.temperature_reading());
            // self.temperature_control(self.settings.temperature_control.slice(0));
            self.rpi_outputs(self.settings.rpi_outputs());
            self.rpi_inputs(self.settings.rpi_inputs());
            self.filamentSensorGcode(self.settings.filamentSensorGcode());

            self.notificationProvider(self.settings.notificationProvider());
            self.showTempNavbar(self.settings.showTempNavbar());
            
            self.event_name(self.settings.event_name());
            self.apiKEY(self.settings.apiKEY());
            self.notifications(self.settings.notifications());
        };

        self.onStartupComplete = function () {
          self.getUpdateBtnStatus();
        };

        self.onDataUpdaterReconnect = function () {
          self.getUpdateBtnStatus();
        };

        self.onSettingsShown = function(){
          self.fixUI();
        };

        self.showColorPicker = function(){
          $('[name=colorpicker]').colorpicker({format: 'rgb'});
        }

        self.onSettingsHidden = function(){
          self.getUpdateBtnStatus();
        };

        self.getRegularOutputs = function(){
          return self.global_settings.settings.plugins.enclosure2.rpi_outputs().filter(function(rpi_outputs) {
           return rpi_outputs.outputType == 'regular';
          });
        };
        self.setTemperature = function(){
            if(self.isNumeric($("#enclosure2SetTemp").val())){
                $.ajax({
                    url: self.buildPluginUrl("/setEnclosure2Temperature"),
                    type: "GET",
                    dataType: "json",
                    data: {"enclosure2SetTemp": Number($("#enclosure2SetTemp").val())},
                     success: function(data) {
                        $("#enclosure2SetTemp").val('');
                        $("#enclosure2SetTemp").attr("placeholder", self.getStatusHeater(data.enclosure2SetTemperature,data.enclosure2CurrentTemperature));
                    }
                });
            }else{
                alert("Temperature is not a number");
            }
        };

        self.addRpiOutput = function(){
          self.global_settings.settings.plugins.enclosure2.rpi_outputs.push({label: ko.observable("Ouput "+
            (self.global_settings.settings.plugins.enclosure2.rpi_outputs().length+1)) ,
            gpioPin:ko.observable(0),activeLow: true,
            autoStartup:ko.observable(false), startupTimeDelay:0, autoShutdown:ko.observable(false),shutdownTimeDelay:0,
            outputType:ko.observable('regular'),frequency:50,dutycycle:0,color:"rgb(255,0,0)",neopixelCount:0,neopixelBrightness:255,microAddress:0});
        };

        self.removeRpiOutput = function(definition) {
          self.global_settings.settings.plugins.enclosure2.rpi_outputs.remove(definition);
        };

        self.addRpiInput = function(){
          self.global_settings.settings.plugins.enclosure2.rpi_inputs.push({label:ko.observable( "Input "+
          (self.global_settings.settings.plugins.enclosure2.rpi_inputs().length+1)), gpioPin: 0,inputPull: "inputPullUp",
          eventType:ko.observable("temperature"),setTemp:100,controlledIO:ko.observable(""),setControlledIO:"low",
          edge:"fall",printerAction:"filament"});
        };

        self.removeRpiInput = function(definition) {
          self.global_settings.settings.plugins.enclosure2.rpi_inputs.remove(definition);
        };

        self.turnOffHeater = function(){
            $.ajax({
                url: self.buildPluginUrl("/setEnclosure2Temperature"),
                type: "GET",
                dataType: "json",
                data: {"enclosure2SetTemp":0},
                 success: function(data) {
                    $("#enclosure2SetTemp").val('');
                    $("#enclosure2SetTemp").attr("placeholder", self.getStatusHeater(data.enclosure2SetTemperature,data.enclosure2CurrentTemperature));
                }
            });
        };

        self.clearGPIOMode = function(){
            $.ajax({
                url: self.buildPluginUrl("/clearGPIOMode"),
                type: "GET",
                dataType: "json",
                 success: function(data) {
                   new PNotify({title:"Enclosure2", text:"GPIO Mode cleared successfully", type: "success"});
                }
            });
        };

        self.getUpdateBtnStatus = function(){

            $.ajax({
                url: self.buildPluginUrl("/getUpdateBtnStatus"),
                type: "GET"
            });
        };

        self.requestEnclosure2Temperature = function(){
            return $.ajax({
                    type: "GET",
                    url: self.buildPluginUrl("/getEnclosure2Temperature"),
                    async: false
                }).responseText;
        };

        self.requestEnclosure2SetTemperature = function(){
            return $.ajax({
                    type: "GET",
                    url: self.buildPluginUrl("/getEnclosure2SetTemperature"),
                    async: false
                }).responseText;
        };

        self.getStatusHeater = function(setTemp,currentTemp){
            if (parseFloat(setTemp)>0.0){
                return cleanTemperature(setTemp);
            }
            return "off";
        };

        self.handleIO = function(data, event){
            $.ajax({
                    type: "GET",
                    dataType: "json",
                    data: {"io": data[0], "status": data[1]},
                    url: self.buildPluginUrl("/setIO"),
                    async: false
            });
        };

        self.handlePWM = function(data, event){
            io = parseInt(data[0]);
            pwmVal = parseInt($("#dutycycle_"+io).val());
            if(pwmVal<0 || pwmVal>100 || isNaN(pwmVal)){
              $("#dutycycle_"+io).val('')
              new PNotify({title:"Enclosure2", text:"Duty Cycle value needs to be between 0 and 100!", type: "error"});
            }else{
              // console.log(pwmVal);
              $("#dutycycle_"+io).val('')
              $("#dutycycle_"+io).attr("placeholder", pwmVal);
              $.ajax({
                      type: "GET",
                      dataType: "json",
                      data: {"io": io, "pwmVal": pwmVal},
                      url: self.buildPluginUrl("/setPWM"),
              });
            }
        };

        self.handleNeopixel = function(data, event){
            io = parseInt(data[0]);
            tempStr = ($("#color_"+io).val()).replace("rgb(", "");

            r = parseInt(tempStr.substring(0, tempStr.indexOf(",")));
            tempStr = tempStr.slice(tempStr.indexOf(",")+1);
            g = parseInt(tempStr.substring(0, tempStr.indexOf(",")));
            tempStr = tempStr.slice(tempStr.indexOf(",")+1);
            b = parseInt(tempStr.substring(0, tempStr.indexOf(")")));

            if(r<0 || r>255 || g<0 || g>255 || b<0 || b >255 || isNaN(r) || isNaN(g) || isNaN(b)){
              new PNotify({title:"Enclosure2", text:"Color needs to follow the format rgb(value_red,value_green,value_blue)!", type: "error"});
            }else {
              $.ajax({
                      type: "GET",
                      dataType: "json",
                      data: {"io": io, "red": r,"green": g,"blue": b},
                      url: self.buildPluginUrl("/setNeopixel"),
              });
            }
        };

        self.fixUI = function(){
          if($('#enableTemperatureReading').is(':checked')){
            $('#enableHeater').prop('disabled', false);
            $('#temperature_reading_content').show("blind");
            // $('#temperature_control_content').show("blind");
          }else{
            $('#enableHeater').prop('disabled', true);
            $('#enableHeater').prop('checked', false);
            $('#temperature_reading_content').hide("blind");
            // $('#temperature_control_content').hide("blind");
          }

          if($('#enableHeater').is(':checked')){
            $('#temperature_control_content').show("blind");
          }else{
            $('#temperature_control_content').hide("blind");
          }

        };

        // self.fixEventTypeUI = function(){
        //   $('[name^="eventType_"]').each(function() {
        //     if($( this ).is(':checked')){
        //       selectedType = $( this ).val();
        //       idNumber = $( this ).attr('name').replace("eventType_", "");
        //       self.eventTypeUI(idNumber,selectedType);
        //     }
        //   });
        // };
        //
        // self.eventTypeUI = function(idNumber,selectedType){
        //
        //   $('#input_io_'+idNumber).hide();
        //   $('#temp_controlled_'+idNumber).hide();
        //   $('#filament_controlled_'+idNumber).hide();
        //   $('#gpio_controlled_'+idNumber).hide();
        //
        //   if(selectedType=='temperature'){
        //     $('#temp_controlled_'+idNumber).show();
        //     console.log("temperature");
        //   }else if(selectedType=='filament'){
        //     $('#filament_controlled_'+idNumber).show();
        //     $('#input_io_'+idNumber).show();
        //     console.log("filament");
        //   }else if(selectedType=='gpio'){
        //     $('#gpio_controlled_'+idNumber).show();
        //     $('#input_io_'+idNumber).show();
        //     console.log("gpio");
        //   }
        // };

        //
        // self.fixAutoStartupUI = function(idNumber){
        //   if($('#autoStartup_'+idNumber).is(':checked')){
        //     $('#autoStartupField_'+idNumber).show("blind");
        //   }else{
        //     $('#autoStartupField_'+idNumber).hide("blind");
        //   }
        // };
        //
        // self.fixAutoShutdownUI = function(idNumber){
        //   if($('#autoShutdown_'+idNumber).is(':checked')){
        //     $('#autoShutdownField_'+idNumber).show("blind");
        //   }else{
        //     $('#autoShutdownField_'+idNumber).hide("blind");
        //   }
        // };

        self.isNumeric = function(n){
          return !isNaN(parseFloat(n)) && isFinite(n);
        };

        self.buildPluginUrl = function(path) {
            return window.PLUGIN_BASEURL + self.pluginName + path;
        };
    }

    OCTOPRINT_VIEWMODELS.push([
        Enclosure2ViewModel,
        ["settingsViewModel","connectionViewModel","printerStateViewModel"],
        ["#tab_plugin_enclosure2","#settings_plugin_enclosure2","#navbar_plugin_enclosure2"]
    ]);
});
