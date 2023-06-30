let appHeader = `    
	
	<header>
        
	  <nav>
	    <img id="logo" src="media/banner.png" />
	      <button id="hamburger-icon"><span class="hamburger-line"></span><span class="hamburger-line"></span><span class="hamburger-line"></span></button>
        <ul id="menu" class="menu">
            <li> <div  id ="index" onclick='goto(this.id)'>     Home</div></li>
            <li> <div id="contact" onclick='goto(this.id)'> Contact</div></li>                
        </ul>
    </nav>
  </header>
`;

document.getElementById("app-header").innerHTML = appHeader;


//get the name of the current page
var path = window.location.pathname;
var page = path.split("/").pop();
var name = page.split(".")[0];
console.log( name );
//get the button with that name
var Button = document.getElementById(name);
//change that color of the button
Button.style.border="3px solid black";



 function goto(buttonID){
        file_name =buttonID+".html"	
	window.open(file_name,"_self")
}

//Menu toggle
  
  $("#hamburger-icon").click(function(){
    $(".menu").toggle();
  });


