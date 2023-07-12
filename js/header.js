let appHeader = `
<header>
    <img id="banner" src="media/banner.png" />
	  
    <nav>
      <button onclick="toggle()" id="hamburger-icon"><span class="hamburger-line"></span><span class="hamburger-line"></span><span class="hamburger-line"></span></button>
            <div class="menu">
              <div  id ="index" onclick='goto(this.id)'>     Home</div>
              <div id="projects" onclick='goto(this.id)'> Projects</div>             
            </div>             
    </nav>
   </header>
`;

document.getElementById("app-header").innerHTML = appHeader;

//<button id="hamburger-icon"><span class="hamburger-line"></span><span class="hamburger-line"></span><span class="hamburger-line"></span></button>


//get the name of the current page
var path = window.location.pathname;
var page = path.split("/").pop();
var name = page.split(".")[0];
console.log( name );
//get the button with that name
var Button = document.getElementById(name);
//change that color of the button
Button.style.color="blue";



 function goto(buttonID){
        file_name =buttonID+".html"	
	window.open(file_name,"_self")
}

//Menu toggle
  
  $("#hamburger-icon").click(function(){
    $(".menu").toggle();
  });


