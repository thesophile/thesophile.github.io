let appHeader = `    
	
	<link rel = "icon" href = "media/channel_logo.png"  type = "image/x-icon">
        <title>Sophile</title>

	<nav>
	    <img id="logo" src="media/thesophile_logo.png" />
	    <button id="hamburger-icon" onclick="showMenu()"><span class="hamburger-line"></span><span class="hamburger-line"></span><span class="hamburger-line"></span></button>
            <ul class="menu">
                <li> <div  id ="index" onclick='goto(this.id)'>     Home</div></li>
                <li> <div id="contact" onclick='goto(this.id)'> Contact</div></li>                
                
            </ul>
        </nav>
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

  const hamburgerIcon = document.getElementById('hamburger-icon');
  const menu = document.getElementsByClassName('menu')[0];
  
  function showMenu() {
  
  
  if (menu.style.display === "none") {
    menu.style.display = "block";
  } else {
    menu.style.display = "none";
  }
  
  }
  

 /*
hamburgerIcon.addEventListener('click', function() {
  
  
  if (menu.style.display === "none") {
    menu.style.display = "block";
  } else {
    menu.style.display = "none";
  }
});
*/

