// ------------------------------------------------------------
// slideshow.js
//
// History:
//
// Copyright 2004 by Mike Koss (mike04@mckoss.com)
//
// This file contains code for the generation of an interactive slideshow or
// image gallery.  It reads the contents of an embedded XML data island
// and creates the DHTML needed to display the gallery.
// See http://coderats.com for more information.
// -----------------------------------------------------mck----
var cbSS = new CodeBase("slideshow.js");

SlideShow.DeriveFrom(Named);

SlideShow.modeLand = 0;
SlideShow.modePort = 1;
SlideShow.modeFlip = 2;
SlideShow.modeFixed = 3;
// Version string format N.N.YYYYMMDD
SlideShow.stRelVersion = "1.0.20040917";
SlideShow.stSourceRoot = "http://www.whizmoandgizmo.com/ig.htm";
SlideShow.stProductName = "The Image Gallery";
SlideShow.stAuthor = "whizmoandgizmo.com";

function SlideShow(xmlSS, divSS)
{
	var ndT;
	var rgb;
	var ndRoot;

	this.Named();

	// Load from URL location instead of XML Data Island
	if (typeof(xmlSS) == "string")
		{
		xmlSS = XMLFromURL(xmlSS);
		ndRoot = xmlSS.documentElement;
		}
	else
		ndRoot= xmlSS.XMLDocument.documentElement;

	if (xmlSS.parseError.errorCode != 0)
		{
		alert(StXMLError(xmlSS));
		this.fXMLError = true;
		return;
		}

	this.wc = new WindowControl();
	this.nav = new URLNav();

	this.fDebug = false;


	this.divTarget = divSS;
	// Move event not generated for div  if not rel or abs positioned - so
	// we rely on getting every window re-size event.
	if (this.divTarget)
		{
		this.wc.fnResize = this.FnCallBack("LayoutChange");
		}

	var	sht = document.styleSheets(0);

	this.dzMargin = XMLAttrDef(ndRoot, "Margin", 10);
	this.dzThumbMargin = XMLAttrDef(ndRoot, "ThumbMargin", this.dzMargin);
	this.dzThumb = XMLAttrDef(ndRoot, "ThumbSize", 40);
	this.dzBorder = XMLAttrDef(ndRoot, "Border", 2);
	this.dzThumbBorder = XMLAttrDef(ndRoot, "ThumbBorder", this.dzBorder);
	this.fUpscale = XMLAttrDef(ndRoot, "Upscale", false);
	this.dptBorder = new Point(2*this.dzBorder, 2*this.dzBorder);
	var rgb = XMLAttrDef(ndRoot, "BorderColor", "white");
	var stStyle = "border: " + this.dzBorder + " solid " + rgb + ";";
	sht.addRule("IMG.Main" , stStyle);
	stStyle = "border: " + this.dzThumbBorder + " solid " + rgb + ";";
	sht.addRule("IMG.Selected", stStyle);
	sht.addRule("IMG.UnloadedSelected", stStyle);

	this.stTransition = XMLAttrDef(ndRoot, "Transition", "Fade");
	this.fNavHigh = XMLAttrDef(ndRoot, "NavHigh", false);

	rgb = XMLAttrDef(ndRoot, "UnselectedColor", "black");
	sht.addRule("IMG.Loaded" , "border: " + this.dzThumbBorder + " solid " + rgb + ";");

	rgb = XMLAttrDef(ndRoot, "ErrorColor", "red");
	sht.addRule("IMG.Error", "border: " + this.dzThumbBorder + " solid " + rgb + ";");

	// BUG: When embedded these style changes to the body may not be desired.
	this.rgbBack = XMLAttrDef(ndRoot, "BackColor", "#3C3C3C");
	sht.addRule("BODY", "background-color: " + this.rgbBack);

	rgb = XMLAttrDef(ndRoot, "TextColor", "white");
	sht.addRule("BODY", "color: " + rgb + ";");
	sht.addRule("A", "color: " + rgb + ";");

	this.stFont = XMLAttrDef(ndRoot, "Font", "Verdana");
	this.wFontSize = XMLAttrDef(ndRoot, "FontSize", 14);
	
	// Default to TextColor (above)
	rgb = XMLAttrDef(ndRoot, "CreditsColor", rgb);
	this.wCreditsFontSize = XMLAttrDef(ndRoot, "CreditsFontSize", 10);
	sht.addRule("DIV.Credits", "font-size: " + this.wCreditsFontSize + ";");
	sht.addRule("DIV.Credits", "color: " + rgb + ";");
	sht.addRule("DIV.Credits A", "color: " + rgb + ";");

	sht.addRule("BODY", "font-family: " + this.stFont + ";");
	sht.addRule("BODY", "font-size: " + this.wFontSize + ";");

	this.dzThumbSpace = this.dzThumb + this.dzThumbMargin + 2*this.dzThumbBorder;
	sht.addRule("TD.Thumb", "width: " + this.dzThumbSpace + "px;");
	sht.addRule("TD.Thumb", "height: " + this.dzThumbSpace + "px;");
	sht.addRule("Table.Thumbs", "margin-left: " + this.dzMargin/2 + "px;");
	sht.addRule("TD.Thumb IMG", "width: " + this.dzThumb + "px;");
	sht.addRule("TD.Thumb IMG", "height: " + this.dzThumb + "px;");

	sht.addRule("Table.ControlBar TD", "width: " + this.dzThumbSpace + "px;");
	sht.addRule("Table.ControlBar TD", "height: " + this.dzThumbSpace + "px;");
	sht.addRule("Table.ControlBar TD IMG", "margin-right: " + this.dzThumbBorder + "px;");

	var stT= XMLAttrDef(ndRoot, "SoundTrack");
	if (stT)
		{
		this.sndBack = new Sound(stT, this.FnCallBack("EndMedia"));
		this.sndBack.fLoop = XMLAttrDef(ndRoot, "SoundLoop", true);
		}
	
	this.fPlay = XMLAttrDef(ndRoot, "AutoPlay", false);
	this.fPlayLoop = XMLAttrDef(ndRoot, "PlayLoop", false);
	this.fSoundFade = XMLAttrDef(ndRoot, "SoundFade", true);

	this.secDelay = XMLAttrDef(ndRoot, "Delay", 7);

	ndT = ndRoot.selectSingleNode("./Title");
	this.stTitle =  StXMLContent(ndT);
	
	sht.addRule(".Title", "font-family:" + XMLAttrDef(ndT, "TitleFont", this.stFont) + ";");
	sht.addRule(".Title", "font-size:" + XMLAttrDef(ndT, "TitleFontSize", this.wFontSize+4) + ";");

	sht.addRule("DIV.Splash", "font-family:" + XMLAttrDef(ndRoot, "TitleFont", this.stFont) + ";");
	sht.addRule(".DIV.Splash", "font-size:" + XMLAttrDef(ndRoot, "TitleFontSize", this.wFontSize+4) + ";");

	this.fShowTitle = XMLAttrDef(ndT, "ShowTitle", true);

	ndT = ndRoot.selectSingleNode("./Home");
	this.stHome = XMLAttrDef(ndT, "HREF");

	ndT = ndRoot.selectSingleNode("./SoundCredit");
	this.stSoundCredit = StXMLContent(ndT);

	ndT = ndRoot.selectSingleNode("./ImageCredit");
	this.stImageCredit = StXMLContent(ndT);
	
	this.ptSizeDef = PtXMLSizeDef(ndRoot, new Point(640, 480));

	this.stImageBase = XMLAttrDef(ndRoot, "ImageBase", "");
	this.stThumbBase = XMLAttrDef(ndRoot, "ThumbBase", this.stImageBase);

	this.stThumbSuffix = XMLAttrDef(ndRoot, "ThumbSuffix", "-T");
	this.stMediumSuffix = XMLAttrDef(ndRoot, "MediumSuffix", "");
	this.stLargeSuffix = XMLAttrDef(ndRoot, "LargeSuffix", "-L");

	this.rgslide = new Array;

	var rgndSlides = ndRoot.selectNodes("./Slide");
	var i;
	for (i = 0; i <  rgndSlides.length; i++)
		this.rgslide[i] = new Slide(this, rgndSlides.item(i), i);

	this.cslides = this.rgslide.length;
	this.cslidesLoaded = 0;
	this.fLayout = false;

	this.timerPlay = new Timer(this.FnCallBack("AutoAdvance"), this.secDelay * 1000, true);

	// Transition and image loading timer - check for loaded images each 1/5 sec
	this.timerTransition = new Timer(this.FnCallBack("DoTransition"), 200);
	this.fFirstSlide = false;
	this.cslidesPre = 0;
	this.timerTransition.Active(true);

	// Prevent text selection in the document - mainly want in divNav -but
	// this looks nicer everywhere too.
	document.onselectstart = new Function("return false;");
}

function SlideShow.prototype.LayoutChange()
{
	// TODO: Could optimize to check for same size and position

	this.fLayout = false;
}

function SlideShow.prototype.ShowSplash()
{
	var rcSplash = RcAbsolute(this.divSplash);
	if (this.divTarget)
		{
		this.Layout();
		this.fLayout = false;
		var rcTarget = this.rcPL.Clone();
		rcTarget.ptLR.x = undefined;
		SizeElt(this.divTarget, rcTarget.ptLR);
		rcSplash.CenterOn(RcAbsolute(this.divTarget).PtCenter());
		}
	else
		rcSplash.CenterOn(this.wc.rcClient.PtCenter());
	PositionElt(this.divSplash, rcSplash.ptUL);
	this.divSplash.style.visibility = "visible";

	this.timerSplash = new Timer(this.FnCallBack("ToggleSplash"), 500);
	this.fSplashOn = true;
	this.timerSplash.Active(true);
}

function SlideShow.prototype.HideSplash()
{
	this.divSplash.style.visibility = "hidden";
	this.timerSplash.Active(false);
}


function SlideShow.prototype.ToggleSplash()
{
	if (this.cslides == 0)
		this.txtLoading.innerText = "No Images in Gallery!";
	this.fSplashOn = !this.fSplashOn;
	this.txtLoading.style.visibility = this.fSplashOn ? "visible" : "hidden";
}

function SlideShow.prototype.PlayMode(fPlay)
{
	this.fPlay = fPlay;
	if (this.btnPlay)
		this.btnPlay.ButtonDown(fPlay);
	if (!fPlay)
		this.timerPlay.Active(false);
}

function SlideShow.prototype.StUI()
{
	var st = "";
	var ccolButtons = 0;

	if (this.fXMLError)
		return "XML Error - " + SlideShow.stProductName + " cannot load.";

	if (this.sndBack)
		st += this.sndBack.StUI();

	if (this.fShowTitle)
		{
		st += "<DIV class=Title " + this.StPartID("Title");
		if (!this.divTarget)
			st += " NOWRAP";
		st += "></DIV>";
		}

	st += "<IMG class=Main GALLERYIMG=false " + this.StPartID("Main") +  " SRC=" + StAttrQuote(cbSS.stPath + "images/blank.gif");
	st += " onclick=" + StAttrQuote(this.StNamed() + ".PopUp();") + ">";

	st += "<DIV class=Desc " + this.StPartID("DivDesc") + ">";
	st += "<SPAN class=Title " + this.StPartID("DTitle") + "></SPAN>";
	st += "<BR><SPAN class=Desc " + this.StPartID("Date") + "></SPAN>";
	st += "<BR><BR><SPAN class=Desc " + this.StPartID("TxtDesc") + "></SPAN>";
	st += "</DIV>";

	st += "<DIV class=Nav " + this.StPartID("Nav") + ">";

	// Control buttons
	st += "<TABLE class=ControlBar cellpadding=0 cellspacing=0><TR>";
	if (this.stHome != undefined)
		{
		this.btnHome = new Button("Home", this.StNamed() + ".Home();",
				cbSS.stPath + "images/home-up.png",
				cbSS.stPath + "images/home-down.png", "Home Page");
		this.btnHome.SetHeight(this.dzThumb);
		st += "<TD>";
		st += this.btnHome.StUI();
		st += "</TD>";
		ccolButtons++;
		}

	if (this.sndBack)
		{
		this.btnSnd = new Button("Sound", this.StNamed() + ".SoundButton();",
				cbSS.stPath + "images/sound-off.png",
				cbSS.stPath + "images/sound-on.png", "Sound On/Off");
		this.btnSnd.fToggle = true;
		this.btnSnd.SetHeight(this.dzThumb);
		st += "<TD>";
		st += this.btnSnd.StUI();
		st += "</TD>";
		ccolButtons++;
		}

	if (this.cslides > 1)
		{
		this.btnPrev = new Button("Prev", this.StNamed() + ".AdvanceClick(-1);",
					cbSS.stPath + "images/prev-up.png",
					cbSS.stPath + "images/prev-down.png", "Previous Image");
		this.btnPrev.SetHeight(this.dzThumb);
		st += "<TD>";
		st += this.btnPrev.StUI();
		st += "</TD>";

		this.btnNext = new Button("Next", this.StNamed() + ".AdvanceClick(1);",
					cbSS.stPath + "images/next-up.png",
					cbSS.stPath + "images/next-down.png", "Next Image");
		this.btnNext.SetHeight(this.dzThumb);
		st += "<TD>";
		st += this.btnNext.StUI();
		st += "</TD>";

		this.btnPlay = new Button("Play", this.StNamed() + ".PlayToggle();",
				cbSS.stPath + "images/play-up.png",
				cbSS.stPath + "images/play-down.png", "Play On/Off");
		this.btnPlay.fToggle = true;
		this.btnPlay.SetHeight(this.dzThumb);

		st += "<TD>";
		st += this.btnPlay.StUI();
		st += "</TD>";

		ccolButtons += 3;
		}

	st += "</TR></TABLE>";

	this.ccol = Math.ceil(Math.sqrt(this.cslides));
	if (this.ccol < ccolButtons)
		this.ccol = ccolButtons;
	this.crw = Math.ceil(this.cslides/this.ccol);

	if (this.cslides > 1)
		{
		st += "<TABLE class=Thumbs cellpadding=0 cellspacing=0>";
		var islide = 0;
		var rw;
		var col;
		for (rw = 0; rw < this.crw; rw++)
			{
			st += "<TR>";
			for (col = 0; col < this.ccol; col++)
				{
				st += "<TD class=Thumb>";
				if (islide < this.cslides)
					st += this.rgslide[islide].StThumbUI();
				st += "</TD>";
				islide++;
				}
			st += "</TR>";
			}
		st += "</TABLE>";
		}

	st += "</DIV>";

	st += "<DIV class=Credits NOWRAP " + this.StPartID("ImageCredit") + "> </DIV>";

	st += "<DIV class=Credits NOWRAP " + this.StPartID("Credits") + ">";
	if (this.stSoundCredit)
		st +="<DIV NOWRAP>Audio: " + this.stSoundCredit + "</DIV>";
	st += "Powered by <A HREF=" + SlideShow.stSourceRoot + ">" + SlideShow.stProductName + "</A>";
	st += "&nbsp;<FONT SIZE=1>(Ver." +  SlideShow.stRelVersion + ")</FONT>";
	st += "</DIV>";

	st += "<DIV " + this.StPartID("Splash") + "class=Splash>";
	st += this.stTitle;
	st += "<BR><BR><SPAN " + this.StPartID("Loading") + ">Loading...</SPAN>"
	st += "</DIV>";

	if (this.fDebug)
		{
		st += "<DIV " + this.StPartID("DivL") + " class=Debug></DIV>";
		st += "<DIV " + this.StPartID("DivP") + " class=Debug></DIV>";
		st += "<DIV " + this.StPartID("DivNavDebug") + " class=Debug></DIV>";
		}
	return st;
}

// This function called after the page is loaded - but note that not all images may yet be loaded!
function SlideShow.prototype.BindUI()
{
	var islide;

	if (this.fXMLError)
		return;

	for (islide = 0; islide < this.cslides; islide++)
		this.rgslide[islide].BindUI();

	if (this.stHome != undefined)
		this.btnHome.BindUI();
	if (this.btnPrev)
		this.btnPrev.BindUI();
	if (this.btnNext)
		this.btnNext.BindUI();
	if (this.btnPlay)
		this.btnPlay.BindUI();
	if (this.sndBack)
		{
		this.sndBack.BindUI();
		this.btnSnd.BindUI();
		}

	if (this.fShowTitle)
		this.txtTitle = this.BoundPart("Title");
	this.imgMain = this.BoundPart("Main");
	this.divDesc = this.BoundPart("DivDesc");
	this.divNav = this.BoundPart("Nav");
	this.divCredits = this.BoundPart("Credits");
	this.divImageCredit = this.BoundPart("ImageCredit");
	this.txtDTitle = this.BoundPart("DTitle");
	this.txtDate = this.BoundPart("Date");
	this.txtDesc = this.BoundPart("TxtDesc");
	this.divSplash = this.BoundPart("Splash");
	this.txtLoading = this.BoundPart("Loading");

	if (this.fDebug)
		{
		this.divL = this.BoundPart("DivL");
		this.divP = this.BoundPart("DivP");
		this.divNavDebug = this.BoundPart("DivNavDebug");
		}

	this.ShowSplash();

	if (this.txtTitle)
		this.txtTitle.innerHTML = this.stTitle;

	// Constructed here in the case that we wanted to put status messages in a page
	// element - only after Bind do we have a DOM object to bind to.
	this.sm = new StatusMsg();

	// Check for hard-coded (1-based) slide number in URL
	var islide = parseInt(this.nav.StParam("Image"));
	if (!isNaN(islide) && islide >= 1 && islide <= this.cslides)
		{
		islide--;
		this.fPlay = false;
		}
	else
		islide = 0;

	this.MakeCur(islide);
	this.PlayMode(this.fPlay);
}

function SlideShow.prototype.WriteUI()
{
	DW(this.StUI());
	this.BindUI();
}

function SlideShow.prototype.FThumbsLoaded()
{
	if (this.cslides < 2)
		return true;

	for (islide = 0; islide < this.cslides; islide++)
		{
		var slide = this.rgslide[islide];
		if (!slide.imgThumb.complete && !slide.fThumbError)
			{
			this.sm.SetStatus("Loading Thumbnail", slide.stThumb);
			return false;
			}
		}
	this.sm.SetStatus("Loading Thumbnail");
	return true;
}

// When a user selects a slide, we should turn off the auto-play mode
function SlideShow.prototype.MakeCurClick(islide)
{
	this.PlayMode(false);
	this.MakeCur(islide);
}

function SlideShow.prototype.MakeCur(islide)
{
	var slide;

	if (this.cslides == 0)
		return;

	if (islide == this.islideCur)
		return;

	var stFade = "progid:DXImageTransform.Microsoft.Fade(overlap=1, duration=0.5);";

MC:
	{
	if (this.islideCur == null)
		{
		this.imgMain.style.filter = stFade;
		break MC;
		}

	slide = this.rgslide[this.islideCur];
	slide.fSel = false;
	slide.SetStatus();

	if (this.stTransition == "Fade")
		{
		this.imgMain.style.filter = stFade;
		break MC;
		}

	// Calculate transition "Direction"; forward(1), backward(-1), or random(0)
	var dir = 0;
	if  (((this.islideCur + 1) % this.cslides) == islide)
		dir = 1;
	if (((this.islideCur + this.cslides - 1) % this.cslides) == islide)
		dir = -1;

	if (dir == 0)
		{
		this.imgMain.style.filter = stFade;
		break MC;
		}

	switch (this.stTransition)
		{
	case "Wipe":
		var stFilter = "progid:XXDXImageTransform.Microsoft.GradientWipe(GradientSize=0.50,duration=0.5,wipestyle=0,motion=";
		
		if (dir == 1)
			stFilter += "reverse);";
		else
			stFilter += "forward);";
		this.imgMain.style.filter = stFilter;
		break;
	case "Slide":
		if (dir == 1)
			this.imgMain.style.filter = "progid:DXImageTransform.Microsoft.Slide(duration=1.0,slidestyle=PUSH,Bands=1);";
		else
			this.imgMain.style.filter = "progid:DXImageTransform.Microsoft.GradientWipe(GradientSize=0.50,duration=1.0,wipestyle=0,motion=forward);";
		break;
		}
	}

	
	this.islideCur = islide;
	slide = this.rgslide[islide];
	slide.fSel = true;
	slide.Reload();
	slide.SetStatus();
}

function SlideShow.prototype.DoTransition()
{
	// Semaphore - non re-entrant.
	if (this.fDT)
		return;
DT: 
	{
	this.fDT = true;

	if (this.islideCur == null)
		break DT;

	if (!this.FThumbsLoaded())
		break DT;

	this.ImageLoader();

	var slide = this.rgslide[this.islideCur];

	try
		{
		// Last transition still in process - don't start next one until previous transition finished
		if (this.stTransition != "None" && this.imgMain.filters[0].status == 2)
			break DT;
		}
	catch(e) {}

	// This is our IDLE state.  The display is quiet, ready to start auto-play timers;  load sound if not loaded yet.
	if (this.fLayout && this.islideCur == this.islideLast && slide.fLoaded)
		{
		// Only start up the AutoPlay timer when the previous transition is complete and we have no new slide
		// to move to (idle).
		if (this.fPlay && !this.timerPlay.FActive())
			this.timerPlay.Active(true);

		// Start up background sound when we're ready to paint the screen
		this.InitSound();

		break DT;
		}

	if (!slide.fLoaded)
		break DT;

	// Get down to displaying the current slide

	try
		{
		if (this.islideCur != this.islideLast && this.stTransition != "None")
			this.imgMain.filters[0].apply();
		}
	catch (e) {}

	this.Layout();

	this.imgMain.src = slide.stSrc;

	this.txtDTitle.innerHTML = slide.stTitle;
	if (slide.stDate)
		this.txtDate.innerText = slide.stDate;
	else
		this.txtDate.innerText = "";
	this.txtDesc.innerHTML = slide.stDesc;

	if (!this.fFirstSlide)
		{
		this.fFirstSlide = true;
		this.imgMain.style.display = "block";
		this.divDesc.style.display = "block";
		this.divNav.style.display = "block";
		this.divCredits.style.visibility = "visible";
		if (this.txtTitle)
			this.txtTitle.style.visibility = "visible";

		this.HideSplash();

		if (this.fDebug)
			{
			this.divL.style.display = "block";
			this.divP.style.display = "block";
			this.divNavDebug.style.display = "block";
			}
		}

	this.PositionSlide(slide);
	try
		{
		if (this.islideCur != this.islideLast && this.stTransition != "None")
			this.imgMain.filters[0].play();
		}
	catch(e) {}
	this.islideLast = this.islideCur;
	}

	this.fDT = false;
}

// We have some idle time - see if there is any speculative image loading we can do.
function SlideShow.prototype.ImageLoader()
{
	var islide;
	var slide;

	if (this.cslidesPre > 0)
		return;

	islide = this.islideCur;
	if (islide == null)
		islide = 0;

	var islideDone = islide;
	var fFirst = true;

	while (fFirst || islide != islideDone)
		{
		fFirst = false;
		slide = this.rgslide[islide];
		if (!slide.fLoaded)
			{
			slide.Preload();
			break;
			}
		islide = (islide+1) % this.cslides;
		}
}

function SlideShow.prototype.PopUp()
{
	if (this.islideCur == null)
		return;
	
	var slide = this.rgslide[this.islideCur];

	slide.PopUp();
}

function SlideShow.prototype.AutoAdvance()
{
	// Stop play mode when going from penultimate to ultimate slide
	if (!this.fPlayLoop && this.islideCur == this.cslides - 2)
		{
		this.PlayMode(false);
		if (this.sndBack && this.fSoundFade)
			this.sndBack.RampVolume(0, this.secDelay, this.FnCallBack("FadeOut"));
		}
	this.Advance(1);
}

function SlideShow.prototype.FadeOut()
{
	this.sndBack.Play(false);
	this.sndBack.SetVolume(100);
	this.btnSnd.ButtonDown(false);
}

function SlideShow.prototype.AdvanceClick(dislide)
{
	this.PlayMode(false);
	// If we don't allow looping, the next and prev buttons do nothing at the beginning and end of the show
	if (!this.fPlayLoop)
		{
		var iNext = 1- 2 * ((this.islideCur + 1) % this.cslides);
		if (dislide == iNext)
			return;
		}

	this.Advance(dislide);
}

function SlideShow.prototype.Advance(dislide)
{
	this.MakeCur((this.islideCur + dislide + this.cslides) % this.cslides);
}

function SlideShow.prototype.Home()
{
	location = this.stHome;
}

function SlideShow.prototype.EndMedia()
{
	this.btnSnd.ButtonDown(false);
}

// Match sound state to state of button
function SlideShow.prototype.SoundButton()
{
	this.fInitSound = true;
	this.sndBack.Play(this.btnSnd.fDown);
	this.btnSnd.ButtonDown(this.btnSnd.fDown);
}

function SlideShow.prototype.InitSound()
{
	if (this.sndBack == undefined || this.fInitSound)
		return;

	this.btnSnd.ButtonDown(true);
	this.SoundButton();
}

function SlideShow.prototype.PlayToggle()
{
	this.PlayMode(!this.fPlay);
	if (this.fPlay)
		this.AutoAdvance(1);
}

function SlideShow.prototype.SizeNav()
{
	if (this.rcNav != undefined)
		return;
	// Note: dom object size not available until it becomes visible (see MakeCur)
	// so we move it off window and make it visible.  Note that the Nav box has a built-in
	// margin on it's top and left sides.
	PositionElt(this.divNav, new Point(-1000,0));
	this.divNav.style.display = "block";
	this.rcNav = new Rect(new Point(0,0), PtSize(this.divNav));
	this.divNav.style.display = "none";
}

	
// ------------------------------------------------------------
// Layout the page parts
//
// Layout modes:
//
// Portrait layout (modePort): Nav box placed to the right of the image rect - bottom aligned.
//	Description placed above the Nav box.
// Lanscape layout (modeLand): Nav box placed beneath the image rect - right aligned.
//	Description placed to the left of Nav box.
// Flip layout (modeFlip): Nav box placed at lower right corner of union of portrait and lanscape
//	bounding rects.  Descriptions are placed above Nav for portrait pics, and to the left of Nav
//	for landscape pics.
//
// Nifty 5-step (whew!) Layout Algorithm:
//
// 1 Compute bounding box of all portrait rects and landscape rects
// 2 If we don't have a predominating orientation, try to fit the Nav box in the
//	lower right of the union of the Landscape and Portrait rects.  If it fits,
//	(does not overlap either bounding rect) we use that.
// 3 If all are Portrait (or all images fit within the Portrait bounding box),
//	then use Portrait mode.
//	EXCEPTION: if Portrait layout does not fit on the user's screen, BUT,
//    Landscape does - then use Landscape.
// 4 Otherwise, if Portrait mode fits the screen, but not Landscape, use Portrait.
// 5 Otherwise, use Landscape.
//
// Output variables:
// this.mode - Primary layout mode for show
// this.ptMain - Position of image rectangle
// this.ptSizeL - Largest (displayed) landscape size
// this.ptSizeP - Largest (displayed) portrait size
// this.rcP - Portrait mode image rectangle (includes borders)
// this.rcL - Landscape more image rectangle (included borders AND credits line)
// this.rcPL - Union of rcL and rcP (")
// this.rcNav - Navigation rectangle
// -----------------------------------------------------mck----
function SlideShow.prototype.Layout()
{
	var rcNavP;
	var rcNavL;
	var islide;
	var slide;
	var dxFixed;

	if (this.fLayout)
		return;
	this.fLayout = true;

	this.SizeNav();

	if (this.divTarget)
		{
		var rcFixed;
		rcFixed = RcAbsolute(this.divTarget);
		dxFixed = rcFixed.Dx();
		this.ptMain = rcFixed.ptUL.Clone();
		this.ptTarget = this.ptMain.Clone();
		}
	else
		this.ptMain = new Point(this.dzMargin, this.dzMargin);

	if (this.txtTitle)
		{
		PositionElt(this.txtTitle, this.ptMain);
		this.ptMain.Offset(0, this.txtTitle.offsetHeight + this.dzMargin/2);
		}

	PositionElt(this.imgMain, this.ptMain);

	this.dyImageCredit = 0;
	if (this.stImageCredit)
		this.dyImageCredit = this.divImageCredit.offsetHeight;
	this.ptSizeL = new Point(0,0);
	this.ptSizeP = new Point(0,0);
	for (islide = 0; islide < this.cslides; islide++)
		{
		slide = this.rgslide[islide];
		if (this.dyImageCredit == 0 && slide.stImageCredit)
			this.dyImageCredit = this.divImageCredit.offsetHeight;	
		if  (slide.FLandscape())
			this.ptSizeL.Max(slide.ptSize);
		else
			this.ptSizeP.Max(slide.ptSize);
		}

Layout:
	{
	// Step 1.

	// For fixed layout - scale target rectangles to fit in available width
	if (this.divTarget)
		{
		var wScale;

		wScale = (dxFixed - 2*this.dzBorder) / this.ptSizeL.x;
		if (this.ptSizeL.x != 0)
			{
			if (this.fUpscale || wScale < 1)
				this.ptSizeL.Mult(wScale);
			dxFixed = this.ptSizeL.x + 2*this.dzBorder;
			}

		wScale = (dxFixed - this.rcNav.Dx() - 2*this.dzBorder) / this.ptSizeP.x;
		if (this.ptSizeP.x != 0 && (this.fUpscale || wScale < 1))
			this.ptSizeP.Mult(wScale);
		}

	this.rcL = new Rect(new Point(0,0), this.ptSizeL);
	this.rcL.Add(this.ptMain);
	this.rcL.ptLR.Add(this.dptBorder);
	this.rcL.ptLR.y += this.dyImageCredit;

	this.rcP = new Rect(new Point(0,0), this.ptSizeP);
	this.rcP.Add(this.ptMain);
	this.rcP.ptLR.Add(this.dptBorder);

	this.rcPL = this.rcP.Clone();
	this.rcPL.Union(this.rcL);

	if (this.fNavHigh)
		this.rcNav.MoveTo(this.rcL.ptLR, this.rcNav.PtUR());
	else
		this.rcNav.MoveTo(this.rcPL.ptLR, this.rcNav.ptLR);

	// For fixed-width layout, we assume the nav control is bigger than the width of rcFixed.
	// Just need to ensure that rcNav lies below rcL.
	if (this.divTarget)
		{
		if (this.rcNav.ptUL.y < this.rcL.ptLR.y)
			this.rcNav.Offset(0, this.rcL.ptLR.y - this.rcNav.ptUL.y);
		this.mode = SlideShow.modeFixed;
		break Layout;
		}

	// Step 2.
	if (!this.rcNav.FIntersect(this.rcL) && !this.rcNav.FIntersect(this.rcP))
		{
		this.mode = SlideShow.modeFlip;
		break Layout;
		}

	// Step 3.
	rcNavP = this.rcNav.Clone()
	rcNavP.Offset(this.rcPL.ptLR.x - this.rcNav.ptUL.x, 0);
	rcNavL = this.rcNav.Clone();
	rcNavL.Offset(0, this.rcPL.ptLR.y - this.rcNav.ptUL.y);

	if (this.rcP.FContainsRc(this.rcL))
		{
		if (this.wc.FFitsScreen(rcNavL.ptLR) && !this.wc.FFitsScreen(rcNavP.ptLR))
			{
			this.mode = SlideShow.modeLand;
			this.rcNav = rcNavL;
			break Layout;
			}
		this.mode = SlideShow.modePort;
		this.rcNav = rcNavP;
		break Layout;
		}

	// Step 4.
	if (this.wc.FFitsScreen(rcNavP.ptLR) && !this.wc.FFitsScreen(rcNavL.ptLR))
		{
		this.mode = SlideShow.modePort;
		this.rcNav = rcNavP;
		break Layout;
		}

	// Step 5.
	this.mode = SlideShow.modeLand;
	this.rcNav = rcNavL;
	}

	// We set width and height to avoid resizing with window resizing
	SetEltRect(this.divNav, this.rcNav);

	if (this.fDebug)
		{
		SetEltRect(this.divL, this.rcL);
		SetEltRect(this.divP, this.rcP);
		SetEltRect(this.divNavDebug, this.rcNav);
		}
}

function SlideShow.prototype.PositionSlide(slide)
{
	var mode = this.mode;
	var ptSize = slide.ptSize.Clone();
	var rcImageCredit;

	if (mode == SlideShow.modeFixed)
		{
		var scaleL = ptSize.ScaleTo(this.ptSizeL);
		var scaleP = ptSize.ScaleTo(this.ptSizeP);
		scale = Math.max(scaleL, scaleP);
		if (!this.fUpscale)
			scale = Math.min(scale, 1.0);

		ptSize.Mult(scale);
		}
	SizeElt(this.imgMain, ptSize);

	ptSize.Add(this.dptBorder);
	this.rcImage = new Rect(this.ptMain);
	this.rcImage.ptLR.Add(ptSize);

	if (mode == SlideShow.modeFlip || mode == SlideShow.modeFixed)
		mode = slide.FLandscape() ? SlideShow.modeLand : SlideShow.modePort;

	// Poistion Image credits - LR for landscape - LL for portrait
	var stCredit = slide.StImageCredit();
	if (stCredit)
		{
		this.divImageCredit.innerHTML = "Image: " + stCredit;
		this.divImageCredit.style.visibility = "visible";
		rcImageCredit = RcAbsolute(this.divImageCredit);
		if (mode == SlideShow.modeLand)
			rcImageCredit.MoveTo(this.rcImage.ptLR, rcImageCredit.PtUR());
		else
			{
			rcImageCredit.MoveTo(this.rcImage.PtLL(), rcImageCredit.ptUL);
			rcImageCredit.Offset(0, this.dzMargin/2);
			}
		PositionElt(this.divImageCredit, rcImageCredit.ptUL);
		}
	else
		this.divImageCredit.style.visibility = "hidden";

	var rcDesc;

	if (mode == SlideShow.modePort)
		{
		rcDesc = new Rect(this.ptMain, this.rcNav.PtUR());
		rcDesc.ptUL.x = this.rcImage.ptLR.x + this.dzMargin/2;
		}
	else
		{
		// Update copy of landscape code - below
		rcDesc = new Rect(this.ptMain, this.rcNav.PtLL());
		rcDesc.ptUL.y = this.rcImage.ptLR.y + this.dyImageCredit;
		}
	SetEltRect(this.divDesc, rcDesc);

	if (mode == SlideShow.modePort)
		{
		// Measure the visible height of the description area to make sure it fits
		var ptSizeDesc = PtSize(this.divDesc);
		if (ptSizeDesc.y >  rcDesc.Dy())
			{
			// Copy of landscape code - above
			rcDesc = new Rect(this.ptMain, this.rcNav.PtLL());
			rcDesc.ptUL.y = this.rcImage.ptLR.y + this.dyImageCredit;
			SetEltRect(this.divDesc, rcDesc);
			}
		}

	var rcCredits = RcAbsolute(this.divCredits);
	var ptCredits = this.rcPL.ptLR.Clone();
	ptCredits.y = Math.max(ptCredits.y, this.rcNav.ptLR.y);
	ptCredits.y += this.dzMargin/2;
	rcCredits.MoveTo(ptCredits, rcCredits.PtUR());
	PositionElt(this.divCredits, rcCredits.ptUL);

	// Size the container to fix lowest component (max of Credits, rcPL+dyImageCredit, or divDesc)
	if (this.divTarget)
		{
		var rcTarget = this.rcPL.Clone();
		rcTarget.ptLR.y += this.dyImageCredit;
		rcTarget.Union(rcCredits);
		rcDesc = RcAbsolute(this.divDesc);
		rcTarget.Union(rcDesc);
		rcTarget.Sub(this.ptTarget);
		rcTarget.ptLR.x = undefined;
		rcTarget.ptLR.y += this.dzMargin;
		SizeElt(this.divTarget, rcTarget.ptLR);
		}
}

Slide.DeriveFrom(Named);

function Slide(ss, nd, islide)
{
	var ndT;

	this.Named();

	this.ss = ss;
	this.nd = nd;
	this.islide = islide;
	this.fNoBase = XMLAttrDef(nd, "NoBase", false);
	var stSrc = XMLAttrDef(nd, "Src");
	this.stSrc = stSrc
	if (!this.fNoBase)
		this.stSrc = StBaseURL(ss.stImageBase, this.stSrc);
	var stBase = this.stSrc;
	this.stSrc = Slide.StModifyPath(this.stSrc, ss.stMediumSuffix);

	this.stThumb = XMLAttrDef(nd, "Thumb");
	if (this.stThumb != undefined)
		{
		if (!this.fNoBase)
			this.stThumb = StBaseURL(ss.stThumbBase, this.stThumb);
		}
	else
		{
		this.stThumb = stBase;
		if (!this.fNoBase)
			this.stThumb = StBaseURL(ss.stThumbBase, this.stThumb);
		this.stThumb = Slide.StModifyPath(this.stThumb, ss.stThumbSuffix);
		}

	this.stLarge = stBase;
	this.stLarge = Slide.StModifyPath(this.stLarge, ss.stLargeSuffix);
	
	this.fLoaded = false;
	this.fFastLoad = false;
	this.fSelected = false;
	this.fError = false;
	this.fThumbError = false;

	ndT = nd.selectSingleNode("./Title");
	this.stTitle = StXMLContent(ndT);
	if (this.stTitle == "")
		this.stTitle = stBase.substring(0, stBase.indexOf(".", 0));

	ndT = nd.selectSingleNode("./Date");
	this.stDate = StXMLContent(ndT);

	ndT = nd.selectSingleNode("./Desc");
	this.stDesc = StXMLContent(ndT);

	ndT = nd.selectSingleNode("./ImageCredit");
	this.stImageCredit = StXMLContent(ndT);

	this.ptSize = PtXMLSizeDef(nd, ss.ptSizeDef);
	this.ptLarge = PtXMLSizeDef(nd, this.ptSize, "Large");
}

function Slide.StModifyPath(stPath, stSuffix)
{
	var ichDot = stPath.lastIndexOf(".");
	stPath = stPath.substring(0, ichDot) + stSuffix + stPath.substring(ichDot);
	return stPath;
}

function Slide.prototype.StThumbUI()
{
	var st = "";
	
	st += "<IMG SRC=" + StAttrQuote(this.stThumb);
	st += " onmousedown=" + StAttrQuote(this.ss.StNamed() + ".MakeCurClick(" + this.islide + ");");
	st += " " + this.StPartID("Thumb");
	st += " TITLE=" + StAttrQuote(this.stTitle);
	st += ">";
	
	return st;
}

function Slide.prototype.BindUI()
{
	if (this.ss.cslides < 2)
		return;
	this.imgThumb = this.BoundPart("Thumb");
	this.imgThumb.onerror = this.FnCallBack("ThumbError");
	this.SetStatus();
}

function Slide.prototype.StImageCredit()
{
	if (this.stImageCredit)
		return this.stImageCredit;
	return this.ss.stImageCredit;
}

function Slide.prototype.ThumbError()
{
	this.fThumbError = true;
}

function Slide.prototype.FLandscape()
{
	return this.ptSize.x >= this.ptSize.y;
}

// Incase the slide has been removed from the IE cache - try reloading it
function Slide.prototype.Reload()
{
	// Only try reload if this was NOT the most recently slide preloaded!
	if (this.ss.islideLastPreloaded == this.islide)
		return;

	this.Unload();
	this.Preload();
}

function Slide.prototype.Unload()
{
	if (this.fLoaded)
		this.ss.cslidesLoaded--
	this.fLoaded = false;
	this.SetStatus();
}

function Slide.prototype.Preload()
{
	// Already loaded
	if (this.fLoaded)
		return;

	// Never successfully loaded - and we're busy loading other images - defer
	if (!this.fFastLoad && this.ss.cslidesPre > 0)
		return;

	// Even if we're currently loading another image, allow images that have already
	// been brought into the cache to load again - likely they will be "free" and load
	// quickly.

	this.ss.islideLastPreloaded = this.islide;

	this.ss.sm.SetStatus("Loading Image", this.stSrc);

	this.imgCache = new Image();
	this.imgCache.onload = this.FnCallBack("Loaded");
	this.imgCache.onerror = this.FnCallBack("Error");
	this.imgCache.src = this.stSrc;
	this.ss.cslidesPre++;

	this.SetStatus();
}

function Slide.prototype.Loaded()
{
	this.fLoaded = true;
	this.fFastLoad = true;
	this.ss.cslidesLoaded++;
	
	// Clear image loading status
	this.ss.sm.SetStatus("Loading Image");

	// Assume only one image is preloading at a time.
	this.ss.cslidesPre--;

	var ptCache = new Point(this.imgCache.width, this.imgCache.height);

	// Once we've loaded an image, prefer it's true dimensions as an esitmate of the "Large"
	// image (in case one is not specified with LargeWidth and LargeHeight attributes).
	this.ptLarge = PtXMLSizeDef(this.nd, ptCache, "Large");

//	if (!this.fError)
//		{
//		// NOTE: If we find an incorrect image dimension in the slide show - we correct
//		// it and re-layout the show.  This may not be correct as the user may want a
//		// scaled image in his show....maybe this code should go.
//		if (this.imgCache.width != this.ptSize.x || this.imgCache.height != this.ptSize.y)
//			{
//			this.ptSize = ptCache;
//			this.ss.fLayout = false;
//			}
//		}
	this.SetStatus();
}

// Error loading an image.
function Slide.prototype.Error()
{
	this.fError = true;
	this.Loaded();
}

Slide.rgstClass = new Array("Unloaded", "Loaded", "UnloadedSelected", "Selected");

function Slide.prototype.SetStatus()
{
	var stClass;

	if (this.ss.cslides < 2)
		return;

	if (this.fError)
		stClass = "Error";
	else
		{
		var iClass = (this.fLoaded ? 1 : 0) + (this.fSel ? 2 : 0);

		stClass = Slide.rgstClass[iClass];	
		}
	this.imgThumb.className = stClass;
}

// Open a new window on the selected image
function Slide.prototype.PopUp()
{
	var ptPos;
	var ptImage = this.ptLarge;
	var ptSize = ptImage.Clone();
	if (!this.ss.wc.FFitsScreen(ptSize))
		{
		ptSize.Min(this.ss.wc.ptMaxVisSize);
		ptPos = new Point(0,0);
		}
	else
		{
		ptPos = this.ss.ptMain.Clone();
		this.ss.wc.Refresh();
		this.ss.wc.PtToScreen(ptPos);
		var ptLR = ptPos.Clone();
		ptLR.Add(ptSize);
		if (ptLR.x > this.ss.wc.ptScreen.x - 20)
			ptPos.x -= ptLR.x - (this.ss.wc.ptScreen.x - 20);
		if (ptLR.y > this.ss.wc.ptScreen.y - 20)
			ptPos.y -= ptLR.y - (this.ss.wc.ptScreen.y - 20);
		ptPos.Max(new Point(0,0));
		}

	var stFeat = "";

	stFeat += "width=" + ptSize.x + ",height=" + ptSize.y + ",";
	stFeat += "menubar=no,location=no,resizable=yes,scrollbars=no,";
	stFeat += "left=" + ptPos.x + ",top=" + ptPos.y;

	var stDoc = "";
	stDoc += "<HEAD>";
	stDoc += cbUtil.StIncludeScript("util.js");
	stDoc += "<TITLE>" + this.stTitle + " - Type ? for Help</TITLE>";
	stDoc +="</HEAD>";
	stDoc += "<BODY style='margin:0;background-color:" + this.ss.rgbBack + "'>";
	stDoc += "<IMG ID=img SRC=" + StAttrQuote(this.stSrc);
	stDoc += " style=" +
		StAttrQuote("width: " + ptImage.x + ";" +
				      "height:" + ptImage.y + ";"
//				      +"filter:progid:DXImageTransform.Microsoft.Fade(overlap=1, duration=0.5);"
				      );
	stDoc += ">";

	// onload for the Body tag does not seem to run in this context!  Need to be sure to
	// construct a DragController only AFTER util.js script has been  loaded
	stDoc += "<SCRIPT>"
	stDoc += DCTestLoad;
	stDoc += DCKey;
	stDoc += DCLock;
	stDoc += DCLargeLoaded;
	stDoc += "var tm = setInterval('DCTestLoad(" + StAttrQuote(this.stLarge) + ");', 500);"
	stDoc += "</" + "SCRIPT>";

	stDoc += "</BODY>";

	var wnd = open("", "_blank", stFeat);
	wnd.document.write(stDoc);

	var rcWindow = new Rect(undefined, ptSize);
}

function DCTestLoad(stLarge)
{
	if (!DragController)
		return;
	clearInterval(tm);
	dc = new DragController(document.body);
	dc.fnKey = DCKey;

	// Overload drag controller as place to store global variables
	dc.scale = 1.0;
	dc.ptBaseSize = PtSize(img);

	dc.wc = new WindowControl(undefined, true);
	DCLock(false);

	dc.stLarge = stLarge;
	dc.imgLarge = new Image();
	dc.imgLarge.onload = DCLargeLoaded;
	dc.imgLarge.src = stLarge;
}

function DCLargeLoaded()
{
	dc.ptBaseSize = new Point(dc.imgLarge.width, dc.imgLarge.height);
	img.src = dc.stLarge;
}

function DCLock(fLock)
{
	dc.fLocked = fLock;
	if (!fLock)
		{
		dc.wc.Refresh();
		dc.ptSizeLast = dc.wc.ptClientSize.Clone();
		}
}

function DCKey()
{
	var dstep = 1.1;

	// For some reason, I can't get the window to fire an onresize event.  So we have to poll
	// window size to see if the user has changed it.
	dc.wc.Refresh();
	if (!dc.fLocked)
		{
		if (!dc.ptSizeLast.FEqual(dc.wc.ptClientSize))
			{
			DCLock(true);
			}
		}

	var dscale = 1;

	switch (event.keyCode)
		{
	// Escape - close window
	case 27:
		if (event.keyCode == 27)
			{
			close();
			return;
			}
		break;

	// +: Increase image scale
	case 187:
		if (dc.scale > 8)
			return;
		dc.scale *= dstep;
		dscale = dstep;
		break;

	// -: Decrease image scale
	case 189:
		if (dc.scale < 0.2)
			return;
		dc.scale /= dstep;
		dscale = 1/dstep;
		break;

	// 1: Reset scale to 1:1 - resize window too
	case 49:
		dc.scale = 1;
		DCLock(false);
		break;

	// space: scale to current window
	case 32:
		DCLock(false);
		break;

	// ? Help
	case 191:
		var stHelp = "";

		stHelp+= "Image Gallery - Pop-Up Viewer\n\n";
		stHelp += "This window can be resized.  If you can't\n";
		stHelp += "see the whole image in the window at once, you\n";
		stHelp += "can scroll the image with the mouse.\n\n";
		stHelp += "You can also scroll with the arrow keys and the Page Up\n";
		stHelp += "and Page Down keys.\n\n";
		stHelp += "Shortcut Keys\n";
		stHelp += "-----------------------------------------\n";
		stHelp += "+: Zoom In\n";
		stHelp += "-: Zoom Out\n";
		stHelp += "1: Scale to Actual Size\n";
		stHelp += "SPACE: Fit window to image\n";
		stHelp += "Escape: Close the window\n";
		alert(stHelp);
		return;
		
	default:
//		alert(event.keyCode);
		return;
		}

//	img.filters[0].apply();
	var ptSize = dc.ptBaseSize.Clone();

	ptSize.Mult(dc.scale);

	var ptCenter  = dc.wc.rcClient.PtCenter();
	ptCenter.Mult(dscale);
	var rc = dc.wc.rcClient.Clone();
	rc.MoveTo(ptCenter, rc.PtCenter());
	var fScroll = rc.ptUL.x > 0 || rc.ptUL.y > 0;

	// I'm see odd intermediate display - flashing bits that I don't
	// understand.  Better effect is to hide the image, move and size
	// it and show it again.  If there is ONLY a move operation, we
	// get rid of the flicker by not bother to hide it.
	if (fScroll)
		img.style.visibility = "hidden";
	SizeElt(img, ptSize);
	if (fScroll)
		{
		dc.wc.ScrollTo(rc.ptUL);
		img.style.visibility = "visible";
		}

//	img.filters[0].play();

	if (!dc.fLocked && dc.wc.FFitsScreen(ptSize) || dc.wc.FFitsWindow(ptSize))
		{
		dc.wc.SizeTo(ptSize);
		DCLock(false);
		}
}
