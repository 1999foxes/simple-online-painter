/// <reference path="Photon-Javascript_SDK.d.ts"/> 

import * as Photon from './Photon-Javascript_SDK.js';
        
var AppInfo = {
    	Wss: false,
        AppId: "f8aef375-eb19-41d1-92af-367a59891301",
        AppVersion: "1.0",
    	MasterServer: undefined,
        NameServer: undefined,
        FbAppId: undefined, 
}
    
    
// fetching app info global variable while in global context
var DemoWss = AppInfo["Wss"];
var DemoAppId = AppInfo["AppId"] ? AppInfo["AppId"] : "<no-app-id>";
var DemoAppVersion = AppInfo["AppVersion"] ? AppInfo["AppVersion"] : "1.0";
var DemoMasterServer = AppInfo["MasterServer"];
var DemoNameServer = AppInfo["NameServer"];
var DemoFbAppId = AppInfo["FbAppId"];

var ConnectOnStart = true;

class DemoLoadBalancing extends Photon.Photon.LoadBalancing.LoadBalancingClient {
    logger = new Photon.Exitgames.Common.Logger("Demo:");

    private USERCOLORS = ["#FF0000", "#00AA00", "#0000FF", "#FFFF00", "#00FFFF", "#FF00FF"];

    constructor() {
        super(DemoWss ? Photon.Photon.ConnectionProtocol.Wss : Photon.Photon.ConnectionProtocol.Ws, DemoAppId, DemoAppVersion);

        // uncomment to use Custom Authentication
        // this.setCustomAuthentication("username=" + "yes" + "&token=" + "yes");

        this.output(this.logger.format("Init", this.getNameServerAddress(), DemoAppId, DemoAppVersion));
        this.logger.info("Init", this.getNameServerAddress(), DemoAppId, DemoAppVersion);
        this.setLogLevel(Photon.Exitgames.Common.Logger.Level.INFO);

        this.myActor().setCustomProperty( "color", this.USERCOLORS[0]);
    }

    start() {
        this.setupUI();
        // connect if no fb auth required 
        if (ConnectOnStart) {
            if (DemoMasterServer) {
                this.setMasterServerAddress(DemoMasterServer);
                this.connect();
            }
            if (DemoNameServer) {
                this.setNameServerAddress(DemoNameServer);
                this.connectToRegionMaster("EU");
            }
            else {
                this.connectToRegionMaster("EU");
            }
        }
    }

    onError(errorCode: number, errorMsg: string) {
        this.output("Error " + errorCode + ": " + errorMsg);
    }

    onEvent(code: number, content: any, actorNr: number) {
        switch(code) {
            case 1:
                var mess = content.message;
                var sender = content.senderName;
                if (actorNr)
                    this.output(sender + ": " + mess, this.myRoomActors()[actorNr].getCustomProperty("color"));
                else
                    this.output(sender + ": " + mess);
                break;
            default:
            }
        this.logger.debug("onEvent", code, "content:", content, "actor:", actorNr);
    }

    onStateChange(state: number) {
        // "namespace" import for static members shorter acceess
        var LBC = Photon.Photon.LoadBalancing.LoadBalancingClient;

        var stateText = document.getElementById("statetxt");
        if (stateText) stateText.textContent = LBC.StateToName(state) || null;
        this.updateRoomButtons();
        this.updateRoomInfo();
    }

    objToStr(x: {}) {
        return JSON.stringify(x);
    }

    updateRoomInfo() {
        var stateText = document.getElementById("roominfo");
        if (stateText === null) return;
        stateText.innerHTML = "room: " + this.myRoom().name + " [" + this.objToStr(this.myRoom().getCustomProperties()) + "] [" + this.myRoom().expectedUsers + "]";
        stateText.innerHTML = stateText.innerHTML + "<br>";
        stateText.innerHTML += " actors: ";        
        stateText.innerHTML = stateText.innerHTML + "<br>";
        for (var nr in this.myRoomActors()) {
            var a = this.myRoomActors()[nr];
            stateText.innerHTML += " " + nr + " " + a.name + " [" + this.objToStr(a.getCustomProperties()) + "]";
            stateText.innerHTML = stateText.innerHTML + "<br>";
        }
        this.updateRoomButtons();
    }

    onActorPropertiesChange(actor: Photon.Photon.LoadBalancing.Actor) { 
        this.updateRoomInfo();
    }

    onMyRoomPropertiesChange() {
        this.updateRoomInfo();
    }

    onRoomListUpdate(rooms: Photon.Photon.LoadBalancing.Room[], roomsUpdated: Photon.Photon.LoadBalancing.Room[], roomsAdded: Photon.Photon.LoadBalancing.Room[], roomsRemoved: Photon.Photon.LoadBalancing.Room[]) {
        this.logger.info("Demo: onRoomListUpdate", rooms, roomsUpdated, roomsAdded, roomsRemoved);
        this.output("Demo: Rooms update: " + roomsUpdated.length + " updated, " + roomsAdded.length + " added, " + roomsRemoved.length + " removed");
        this.onRoomList(rooms);
        this.updateRoomButtons(); // join btn state can be changed
    }

    onRoomList(rooms: Photon.Photon.LoadBalancing.Room[]) {
        var menu = document.getElementById("gamelist");
        if (menu === null) return;
        while (menu.firstChild) {
            menu.removeChild(menu.firstChild);
        }
        var selectedIndex = 0;
        for (var i = 0; i < rooms.length;++i) {
            var r = rooms[i];
            var item = document.createElement("option");
            item.setAttribute("value", r.name);
            item.textContent = r.name;
            menu.appendChild(item);
            if (this.myRoom().name == r.name) {
                selectedIndex = i;
            }
        }
        (<HTMLSelectElement>menu).selectedIndex = selectedIndex;
        this.output("Demo: Rooms total: " + rooms.length);
        this.updateRoomButtons(); 
    }
    
    onJoinRoom() {
        this.output("Game " + this.myRoom().name + " joined");
        this.updateRoomInfo()
    }
    onActorJoin(actor: Photon.Photon.LoadBalancing.Actor) {
        this.output("actor " + actor.actorNr + " joined");
        this.updateRoomInfo()
    }
    onActorLeave(actor: Photon.Photon.LoadBalancing.Actor) {
        this.output("actor " + actor.actorNr + " left");
        this.updateRoomInfo()
    }
    sendMessage(message: string) {
        try {
            this.raiseEvent(1, { message: message, senderName: "user" + this.myActor().actorNr });
            this.output('me[' + this.myActor().actorNr + ']: ' + message, this.myActor().getCustomProperty("color"));
        }
        catch (err) {
            if (err instanceof Error)
                this.output("error: " + err.message);
        }
    }

    setupUI() {
        this.logger.info("Setting up UI.");

        var input = <HTMLInputElement>document.getElementById("input");
        input.value = 'hello';
        input.focus();

        var btnJoin = <HTMLButtonElement>document.getElementById("joingamebtn");
        btnJoin.onclick = (ev) => {
            if (this.isInLobby()) {
                var menu = <HTMLSelectElement>document.getElementById("gamelist");
                var gameId = menu.children[menu.selectedIndex].textContent;
                var expectedUsers = <HTMLInputElement>document.getElementById("expectedusers");
                this.output(gameId || "");
                this.joinRoom(gameId || "", { expectedUsers: expectedUsers.value.length > 0 ? expectedUsers.value.split(",") : undefined });
            }
            else {
                this.output("Reload page to connect to Master");
            }
            return false;
        }

        var btnJoinOrCreate = <HTMLButtonElement>document.getElementById("joinorcreategamebtn");
        btnJoinOrCreate.onclick = (ev) => {
            if (this.isInLobby()) {
                var gameId = <HTMLInputElement>document.getElementById("newgamename");
                var expectedUsers = <HTMLInputElement>document.getElementById("expectedusers");
                if (gameId === null || expectedUsers === null || gameId.value.length === 0) return;
                this.output(gameId.value);
                this.joinRoom(gameId.value, { createIfNotExists: true, expectedUsers: expectedUsers.value.length > 0 ? expectedUsers.value.split(",") : undefined });
            }
            else {
                this.output("Reload page to connect to Master");
            }
            return false;
        }

        var btnJoinRandom = <HTMLButtonElement>document.getElementById("joinrandomgamebtn");
        btnJoinRandom.onclick = (ev) => {
            if (this.isInLobby()) {
                this.output("Random Game...");
                var expectedUsers = <HTMLInputElement>document.getElementById("expectedusers");
                this.joinRandomRoom({ expectedUsers: expectedUsers.value.split(",") });
            }
            else {
                this.output("Reload page to connect to Master");
            }
            return false;
        }

        var btnNew = <HTMLButtonElement>document.getElementById("newgamebtn");
        btnNew.onclick = (ev) => {
            if (this.isInLobby()) {
                var name = <HTMLInputElement>document.getElementById("newgamename");
                this.output("New Game");
                var expectedUsers = <HTMLInputElement>document.getElementById("expectedusers");
                this.createRoom(name.value.length > 0 ? name.value : undefined, { expectedUsers: expectedUsers.value.length > 0 ? expectedUsers.value.split(",") : undefined, maxPlayers : 6 });
            }
            else {
                this.output("Reload page to connect to Master");
            }
            return false;
        }

        var btnSetExpectedUsers = <HTMLButtonElement>document.getElementById("setexpectedusers");
        btnSetExpectedUsers.onclick = (ev) => {
            this.myRoom().setExpectedUsers((<HTMLInputElement>document.getElementById("expectedusers")).value.split(","));
        }

        var btnClearExpectedUsers = <HTMLButtonElement>document.getElementById("clearexpectedusers");
        btnClearExpectedUsers.onclick = (ev) => {
            this.myRoom().clearExpectedUsers();
        }

        var form = <HTMLFormElement>document.getElementById("mainfrm");
        form.onsubmit = () => {
            if (this.isJoinedToRoom()) {
                var input = <HTMLInputElement>document.getElementById("input");

                this.sendMessage(input.value);
                input.value = '';
                input.focus();
            }
            else {
                if (this.isInLobby()) {
                    this.output("Press Join or New Game to connect to Game");
                }
                else {
                    this.output("Reload page to connect to Master");
                }
            }
            return false;
        }

        var btn = <HTMLButtonElement>document.getElementById("leavebtn");
        btn.onclick = (ev) => {
            this.leaveRoom();
            return false;
        }

        btn = <HTMLButtonElement>document.getElementById("colorbtn");
        btn.onclick = (ev) => {
            var ind = Math.floor(Math.random() * this.USERCOLORS.length);
			var color:String = this.USERCOLORS[ind];				

			this.myActor().setCustomProperty("color", color);

			this.sendMessage( "... changed his / her color!");
        }

        this.updateRoomButtons();
    }

    output(str: string, color?: string) {
        var log = document.getElementById("theDialogue");
        if (log === null) return;
        var escaped = str.replace(/&/, "&amp;").replace(/</, "&lt;").
        replace(/>/, "&gt;").replace(/"/, "&quot;");
        if (color) {
            escaped = "<FONT COLOR='" + color + "'>" + escaped + "</FONT>"; 
        }
        log.innerHTML = log.innerHTML + escaped + "<br>";
        log.scrollTop = log.scrollHeight;
    }

    private updateRoomButtons() {
        var btn;
        btn = <HTMLButtonElement>document.getElementById("newgamebtn");
        btn.disabled = !(this.isInLobby() && !this.isJoinedToRoom() );

        var canJoin = this.isInLobby() && !this.isJoinedToRoom() && this.availableRooms().length > 0;
        btn = <HTMLButtonElement>document.getElementById("joingamebtn");
        btn.disabled = !canJoin;
        btn = <HTMLButtonElement>document.getElementById("joinrandomgamebtn");
        btn.disabled = !canJoin;

        btn = <HTMLButtonElement>document.getElementById("leavebtn");
        btn.disabled = !( this.isJoinedToRoom() );
    }
}

var demo;
window.onload = () => {
    demo = new DemoLoadBalancing();
    demo.start();
};

export { DemoLoadBalancing };
