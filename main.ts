/**
 * MakeCode extension for ESP32-C3-M Wifi modules
 */
//% color=#009b5b icon="\uf1eb" block="ESP32-C3-M"
namespace ESP8266ThingSpeak {

    let wifi_connected: boolean = false
    let thingspeak_connected: boolean = false
    let last_upload_successful: boolean = false

    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 100) {
        serial.writeString(command + "\u000D\u000A")
        basic.pause(wait)
    }

    // wait for certain response from ESP8266
    function waitResponse(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200) serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("OK") || serial_str.includes("ALREADY CONNECTED")) {
                result = true
                break
            } else if (serial_str.includes("ERROR") || serial_str.includes("SEND FAIL")) {
                break
            }
            if (input.runningTime() - time > 30000) break
        }
        return result
    }

    /**
    * Initialize ESP8266 module and connect it to Wifi router
    */
    //% block="Initialize ESP32-C3|RX (Tx of micro:bit) %tx|TX (Rx of micro:bit) %rx|Baud rate %baudrate"
    //% tx.defl=SerialPin.P0
    //% rx.defl=SerialPin.P1
    export function Initialize(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        wifi_connected = false
        thingspeak_connected = false
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        sendAT("AT+RESTORE", 2000) // restore to factory settings
        sendAT("AT+CWMODE=1", 1000) // set to STA mode
        sendAT("ATE0", 1000) // echo off
        sendAT("AT+CWLAPOPT=1,2,-50,1", 1000) // Set the Configuration for the Command AT+CWLAP
        sendAT("AT+CWLAP", 0) // List Available APs
        basic.pause(100)
    }

    /**
    * connect it to Wifi router
    */
    //% block="connectWifi|Wifi SSID = %ssid|Wifi PW = %pw"
    //% ssid.defl=ssid
    //% pw.defl=pw
    export function connectWifi(ssid: string, pw: string) {
        wifi_connected = false
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router
        wifi_connected = waitResponse()
        basic.pause(100)
    }
    
    /**
    * Connect to ThingSpeak and upload data. It would not upload anything if it failed to connect to Wifi or ThingSpeak.
    */
    //% block="Upload data to ThingSpeak|URL/IP = %ip|Write API key = %write_api_key|Field 1 = %n1|Field 2 = %n2|Field 3 = %n3|Field 4 = %n4|Field 5 = %n5|Field 6 = %n6|Field 7 = %n7|Field 8 = %n8"
    //% ip.defl=api.thingspeak.com
    //% write_api_key.defl=your_write_api_key
    export function connectThingSpeak(ip: string, write_api_key: string, n1: number, n2: number, n3: number, n4: number, n5: number, n6: number, n7: number, n8: number) {
        if (wifi_connected && write_api_key != "") {
            thingspeak_connected = false
            sendAT("AT+CIPSTART=\"TCP\",\"" + ip + "\",80", 0) // connect to website server
            thingspeak_connected = waitResponse()
            basic.pause(100)
            if (thingspeak_connected) {
                last_upload_successful = false
                let str: string = "GET /update?api_key=" + write_api_key + "&field1=" + n1 + "&field2=" + n2 + "&field3=" + n3 + "&field4=" + n4 + "&field5=" + n5 + "&field6=" + n6 + "&field7=" + n7 + "&field8=" + n8
                sendAT("AT+CIPSEND=" + (str.length + 2))
                sendAT(str, 0) // upload data
                last_upload_successful = waitResponse()
                basic.pause(100)
            }
        }
    }

    /**
    * Wait between uploads
    */
    //% block="Wait %delay ms"
    //% delay.min=0 delay.defl=5000
    export function wait(delay: number) {
        if (delay > 0) basic.pause(delay)
    }
    
    /**
    * Configure to AP mode
    */
    //% block="Set to AP mode"
    export function SetApMode() {
        sendAT("AT+RESTORE", 2000) // restore to factory settings
        sendAT("AT+CWMODE=3", 1000) // set to STA and AP mode
        sendAT("AT+RST", 2000) // restart
        sendAT("AT+CIPMUX=1", 1000) // Start AP multi connection
        sendAT("AT+CIPSERVER=1,808", 1000) // Set the server port to 808
    }
    
    /**
    * Check if ESP8266 successfully connected to Wifi
    */
    //% block="Wifi connected ?"
    export function isWifiConnected() {
        return wifi_connected
    }

    /**
    * Check if ESP8266 successfully connected to ThingSpeak
    */
    //% block="ThingSpeak connected ?"
    export function isThingSpeakConnected() {
        return thingspeak_connected
    }
    
    /**
    * Check List of available APs
    */
    //% block="List of available APs"
    export function ListOfAvailableAPs(): string {
        return serial.readString()
    }
    
    /**
    * Information received by Wifi
    */
    //% block="Information received = %data"
    //% data.defl=0
    export function InformationReceived(data: string): string {
        let target_str: string = "\u000D\u000A" + "+IPD,0,1:" + data + "\u000D\u000A"
        let received_str: string = serial.readString()
        let received_result: boolean = false
        if (received_str == target_str) {
            received_result = true
        }
        else {
            received_result = false
        }
        return target_str
    }
        
    /**
    * Check if ESP8266 successfully uploaded data to ThingSpeak
    */
    //% block="Last data upload successful ?"
    export function isLastUploadSuccessful() {
        return last_upload_successful
    }

}
