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
// See http://mckoss.com/jscript/slideshow for more information.
// -----------------------------------------------------mck----
var cbSS = new CodeBase("slideshow.js");

SlideShow.DeriveFrom(Named);

SlideShow.modeLand = 0;
SlideShow.modePort = 1;
SlideShow.modeFlip = 2;
SlideShow.stRelVersion = "2004-05-27";
SlideShow.stSourceRoot = "http://coderats.com/";
SlideShow.stProductName = "The Image Gallery";
SlideShow.stAuthor = "CodeRats.com";

function SlideShow(xmlSS)
{
	var ndT;
	var rgb;

	this.Named();
	this.wc = new WindowControl(false);

	this.fDebug = false;

	var ndRoot= xmlSS.XMLDocument.documentElement;

	var	sht = document.styleSheets(0);

	this.dzMargin = XMLAttrDef(ndRoot, "Margin", 10);
	this.dzThumb = XMLAttrDef(ndRoot, "ThumbSize", 40);
	this.dzBorder = XMLAttrDef(ndRoot, "Border", 2);
	var rgb = XMLAttrDef(ndRoot, "BorderColor", "white");
	var stStyle = "border: " + this.dzBorder + " solid " + rgb + ";";
	sht.addRule("IMG.Main" , stStyle);
	sht.addRule("IMG.Selected", stStyle);

	rgb = XMLAttrDef(ndRoot, "UnselectedColor", "black");
	sht.addRule("IMG.Loaded" , "border: " + this.dzBorder + " solid " + rgb + ";");

	rgb = XMLAttrDef(ndRoot, "ErrorColor", "red");
	sht.addRule("IMG.Error", "border: " + this.dzBorder + " solid " + rgb + ";");
	
	rgb = XMLAttrDef(ndRoot, "BackColor", "#3C3C3C");
	sht.addRule("BODY", "background: " + rgb);

	rgb = XMLAttrDef(ndRoot, "TextColor", "white");
	sht.addRule("BODY", "color: " + rgb + ";");
	sht.addRule("A", "color: " + rgb + ";");

	this.stFont = XMLAttrDef(ndRoot, "Font", "Verdana");
	this.wFontSize = XMLAttrDef(ndRoot, "FontSize", 14);

	sht.addRule("BODY", "font-family: " + this.stFont + ";");
	sht.addRule("BODY", "font-size: " + this.wFontSize + ";");

	sht.addRule(".Title", "font-family:" + XMLAttrDef(ndRoot, "TitleFont", this.stFont) + ";");
	sht.addRule(".Title", "font-size:" + XMLAttrDef(ndRoot, "TitleFontSize", this.wFontSize+4) + ";");

	sht.addRule("DIV.Splash", "font-family:" + XMLAttrDef(ndRoot, "TitleFont", this.stFont) + ";");
	sht.addRule(".DIV.Splash", "font-size:" + XMLAttrDef(ndRoot, "TitleFontSize", this.wFontSize+4) + ";");

	this.dzThumbSpace = this.dzThumb + this.dzMargin + 2*this.dzBorder;
	sht.addRule("TD.Thumb", "width: " + this.dzThumbSpace + "px;");
	sht.addRule("TD.Thumb", "height: " + this.dzThumbSpace + "px;");

	sht.addRule("Table.ControlBar TD", "width: " + this.dzThumbSpace + "px;");
	sht.addRule("Table.ControlBar TD", "height: " + this.dzThumbSpace + "px;");


	var stT= XMLAttrDef(ndRoot, "SoundTrack");
	if (stT)
		{
		this.sndBack = new Sound(stT);
		this.sndBack.fLoop = true;
		}

	this.secDelay = XMLAttrDef(ndRoot, "Delay", 7);

	ndT = ndRoot.selectSingleNode("./Title");
	this.stTitle =  StXMLContent(ndT);

	ndT = ndRoot.selectSingleNode("./Home");
	this.stHome = XMLAttrDef(ndT, "HREF");

	this.ptSizeDef = PtXMLSizeDef(ndRoot, new Point(640, 480));

	this.stImageBase = XMLAttrDef(ndRoot, "ImageBase", "");
	this.stThumbBase = XMLAttrDef(ndRoot, "ThumbBase", this.stImageBase);

	this.rgslide = new Array;

	var rgndSlides = ndRoot.selectNodes("./Slide");
	var i;
	for (i = 0; i <  rgndSlides.length; i++)
		this.rgslide[i] = new Slide(this, rgndSlides.item(i), i);

	this.cslides = this.rgslide.length;
	this.cslidesLoaded = 0;
	this.ccol = Math.ceil(Math.sqrt(this.cslides));
	this.crw = Math.ceil(this.cslides/this.ccol);
	this.fLayout = false;

	this.timerPlay = new Timer(this.StNamed() + ".AutoAdvance();", this.secDelay * 1000);
	this.fPlay = XMLAttrDef(ndRoot, "AutoPlay", false);

	// Transition and image loading timer - check for loaded images each 1/10 sec
	this.timerTransition = new Timer(this.StNamed() + ".DoTransition();", 100);
	this.timerTransition.Active(true);

	this.fFirstSlide = false;
	this.fTransition = false;
	this.cslidesPre = 0;

	// Prevent text selection in the document - mainly want in divNav -but
	// this looks nicer everywhere too.
	document.onselectstart = new Function("return false;");
}

function SlideShow.prototype.ToggleSplash()
{
	if (this.cslides == 0)
		this.txtLoading.innerText = "No Slides!";
	this.fSplashOn = !this.fSplashOn;
	this.txtLoading.style.visibility = this.fSplashOn ? "visible" : "hidden";
}

function SlideShow.prototype.PlayMode(fPlay)
{
	this.fPlay = fPlay;
	this.btnPlay.ButtonDown(fPlay);
	this.timerPlay.Active(fPlay);
}

function SlideShow.prototype.StUI()
{
	var st = "";

	if (this.sndBack)
		st += this.sndBack.StUI();

	st += "<DIV class=Title " + this.StPartID("Title") + " NOWRAP></DIV>";

	st += "<IMG class=Main " + this.StPartID("Main") +  " SRC='" + cbSS.stPath + "images/blank.gif'>";

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
		}

	if (this.sndBack)
		{
		this.btnSnd = new Button("Sound", this.StNamed() + ".SoundToggle();",
				cbSS.stPath + "images/sound-on.png",
				cbSS.stPath + "images/sound-off.png", "Sound On/Off");
		this.btnSnd.fToggle = true;
		this.btnSnd.SetHeight(this.dzThumb);
		st += "<TD>";
		st += this.btnSnd.StUI();
		st += "</TD>";
		}

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

	st += "</TR></TABLE>";

	st += "<TABLE cellpadding=0 cellspacing=0>";
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
	
	st += "</TABLE></DIV>";

	st += "<DIV " + this.StPartID("Credits") + " class=Credits NOWRAP>";
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

	for (islide = 0; islide < this.cslides; islide++)
		this.rgslide[islide].BindUI();

	if (this.stHome != undefined)
		this.btnHome.BindUI();
	this.btnPrev.BindUI();
	this.btnNext.BindUI();
	this.btnPlay.BindUI();
	if (this.sndBack)
		{
		this.sndBack.BindUI();
		this.btnSnd.BindUI();
		}

	this.txtTitle = this.BoundPart("Title");
	this.imgMain = this.BoundPart("Main");
	this.divDesc = this.BoundPart("DivDesc");
	this.divNav = this.BoundPart("Nav");
	this.divCredits = this.BoundPart("Credits");
	this.txtDTitle = this.BoundPart("DTitle");
	this.txtDate = this.BoundPart("Date");
	this.txtDesc = this.BoundPart("TxtDesc");
	this.divSplash = this.BoundPart("Splash");
	this.txtLoading = this.BoundPart("Loading");

	var rcSplash = RcAbsolute(this.divSplash);
	rcSplash.CenterOn(this.wc.rc.PtCenter());
	PositionElt(this.divSplash, rcSplash.ptUL);
	this.divSplash.style.visibility = "visible";

	this.timerSplash = new Timer(this.StNamed() + ".ToggleSplash();", 500);
	this.fSplashOn = true;
	this.timerSplash.Active(true);
	
	if (this.fDebug)
		{
		this.divL = this.BoundPart("DivL");
		this.divP = this.BoundPart("DivP");
		this.divNavDebug = this.BoundPart("DivNavDebug");
		}

	this.txtTitle.innerHTML = this.stTitle;
	this.sm = new StatusMsg();

	this.MakeCur(0);
	this.PlayMode(this.fPlay);
}

function SlideShow.prototype.WriteUI()
{
	DW(this.StUI());
	this.BindUI();
}

function SlideShow.prototype.FThumbsLoaded()
{
	for (islide = 0; islide < this.cslides; islide++)
		{
		var slide = this.rgslide[islide];
		if (!slide.imgThumb.complete && !slide.fThumbError)
			{
			this.sm.SetStatus("thumb", "Loading thumbnail " + slide.stThumb);
			return false;
			}
		}
	this.sm.SetStatus("thumb");
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

	if (this.islideCur != null)
		{
		slide = this.rgslide[this.islideCur];
		slide.fSel = false;
		slide.SetStatus();
		}

	this.islideCur = islide;
	slide = this.rgslide[islide];
	slide.fSel = true;
	slide.Preload();
	slide.SetStatus();
	this.fTransition = true;
}

function SlideShow.prototype.DoTransition()
{
	if (!this.FThumbsLoaded())
		return;

	if (!this.fTransition)
		{
		this.SpecLoad();
		return;
		}

	var slide = this.rgslide[this.islideCur];

	if (!slide.fLoaded)
		{
		this.sm.SetStatus("image", "Loading image " + slide.stSrc);
		return;
		}

	this.sm.SetStatus("image");

	this.fTransition = false;

	// Start up background sound when we're ready to paint the screen
	if (this.sndBack && this.sndBack.fPlay == undefined)
		this.sndBack.Play(true);

	document.body.filters[0].apply();

	if (!this.fLayout)
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
		this.divCredits.style.display = "block";
		this.txtTitle.style.visibility = "visible";
		this.divSplash.style.visibility = "hidden";
		this.timerSplash.Active(false);

		if (this.fDebug)
			{
			this.divL.style.display = "block";
			this.divP.style.display = "block";
			this.divNavDebug.style.display = "block";
			}
		}

	this.PositionSlide(slide);

	document.body.filters[0].play();
}

// We have some idle time - see if there is any speculative image loading we can do.
function SlideShow.prototype.SpecLoad()
{
	var islide;
	var slide;

	if (this.cslidesPre > 0 ||this.cslidesLoaded == this.cslides)
		return;

	islide = this.islideCur;
	if (islide == null)
		islide = 0;
	else
		islide = (islide + 1) % this.cslides;

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

function SlideShow.prototype.AutoAdvance()
{
	// Stop play mode when going from penultimate to ultimate slide
	if (this.islideCur == this.cslides - 2)
		{
		this.PlayMode(false);
		if (this.sndBack)
			this.sndBack.RampVolume(0, this.secDelay);
		}
	this.Advance(1);
}

function SlideShow.prototype.AdvanceClick(dislide)
{
	this.PlayMode(false);
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

function SlideShow.prototype.SoundToggle()
{
	this.sndBack.Play(!this.sndBack.fPlay);
}

function SlideShow.prototype.PlayToggle()
{
	if (!this.fPlay)
		this.Advance(1);
	this.PlayMode(!this.fPlay);
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
// -----------------------------------------------------mck----
function SlideShow.prototype.Layout()
{
	var dpt;
	var rcNavP;
	var rcNavL;
	var islide;
	var slide;

	this.ptSizeL = new Point(0,0);
	this.ptSizeP = new Point(0,0);
	for (islide = 0; islide < this.cslides; islide++)
		{
		slide = this.rgslide[islide];
		if  (slide.FLandscape())
			this.ptSizeL.Max(slide.ptSize);
		else
			this.ptSizeP.Max(slide.ptSize);
		}
	
	// Position image and Show Title
	this.ptMain = new Point(this.dzMargin, this.dzMargin);
	PositionElt(this.txtTitle, this.ptMain);

	this.ptMain.Offset(0, this.txtTitle.offsetHeight + this.dzMargin/2);
	PositionElt(this.imgMain, this.ptMain);

	// Note: dom object size not available until it becomes visible (see MakeCur)
	// so we move it off screen and make it visible.  Note that the Nav box has a built-in
	// margin on it's top and left sides.
	PositionElt(this.divNav, new Point(-1000,0));
	this.divNav.style.display = "block";
	this.rcNav = new Rect(new Point(0,0), PtSize(this.divNav));
	this.divNav.style.display = "none";

Layout:
	{
	// Step 1.
	this.ptSizeL.Add(new Point(2*this.dzBorder, 2*this.dzBorder));
	this.rcL = new Rect(new Point(0,0), this.ptSizeL);
	this.rcL.Add(this.ptMain);

	this.ptSizeP.Add(new Point(2*this.dzBorder, 2*this.dzBorder));
	this.rcP = new Rect(new Point(0,0), this.ptSizeP);
	this.rcP.Add(this.ptMain);

	this.rcPL = this.rcP.Clone();
	this.rcPL.Union(this.rcL);

	dpt = this.rcPL.ptLR.Clone();
	dpt.Sub(this.rcNav.ptLR);
	this.rcNav.Add(dpt);

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

	this.fLayout = true;
}

function SlideShow.prototype.PositionSlide(slide)
{
	SizeElt(this.imgMain, slide.ptSize);

	var ptDesc = this.ptMain.Clone();
	ptDesc.Offset(0, slide.ptSize.y);

	var mode = this.mode;
	var rcDesc;
	if (mode == SlideShow.modeFlip)
		mode = slide.FLandscape() ? SlideShow.modeLand : SlideShow.modePort;
	
	if (mode == SlideShow.modePort)
		{
		rcDesc = new Rect(this.rcPL.ptUL, this.rcNav.PtUR());
		rcDesc.ptUL.x += slide.ptSize.x + this.dzMargin;
		}
	else
		{
		rcDesc = new Rect(this.rcPL.ptUL, this.rcNav.PtLL());
		rcDesc.ptUL.y += slide.ptSize.y + this.dzMargin;
		}
	SetEltRect(this.divDesc, rcDesc);

	if (mode == SlideShow.modePort)
		{
		// Measure the visible height of the description area to make sure it fits
		var ptSizeDesc = PtSize(this.divDesc);
		if (ptSizeDesc.y >  rcDesc.Dy())
			{
			rcDesc = new Rect(this.rcPL.ptUL, this.rcNav.PtLL());
			rcDesc.ptUL.y += slide.ptSize.y + this.dzMargin;
			SetEltRect(this.divDesc, rcDesc);
			}
		}

	var ptCredits = this.rcNav.PtLL();
	ptCredits.x = this.ptMain.x;
	ptCredits.y += this.dzMargin;
	var rcDescActual = RcAbsolute(this.divDesc);
	if (ptCredits.y < rcDescActual.ptLR.y + this.dzMargin)
		{
		ptCredits.y = rcDescActual.ptLR.y + this.dzMargin;
		}
	PositionElt(this.divCredits, ptCredits);
}

Slide.DeriveFrom(Named);

function Slide(ss, nd, islide)
{
	var ndT;

	this.Named();

	this.ss = ss;
	this.islide = islide;
	this.fNoBase = XMLAttrDef(nd, "NoBase", false);
	var stSrc = XMLAttrDef(nd, "Src");
	this.stSrc = stSrc
	if (!this.fNoBase)
		this.stSrc = StBaseURL(ss.stImageBase, this.stSrc);

	this.stThumb = XMLAttrDef(nd, "Thumb");
	if (this.stThumb != undefined)
		{
		if (!this.fNoBase)
			this.stThumb = StBaseURL(ss.stThumbBase, this.stThumb);
		}
	else
		{
		this.stThumb = stSrc;
		if (!this.fNoBase)
			this.stThumb = StBaseURL(ss.stThumbBase, this.stThumb);
		var ichDot = this.stThumb.lastIndexOf(".");
		this.stThumb = this.stThumb.substring(0, ichDot) + "-T" + this.stThumb.substring(ichDot);
		}
	
	this.fLoaded = false;
	this.fError = false;
	this.fThumbError = false;

	ndT = nd.selectSingleNode("./Title");
	this.stTitle = StXMLContent(ndT);
	if (this.stTitle == "")
		this.stTitle = this.stSrc.substring(0, this.stSrc.indexOf(".", 0));

	ndT = nd.selectSingleNode("./Date");
	this.stDate = StXMLContent(ndT);

	ndT = nd.selectSingleNode("./Desc");
	this.stDesc = StXMLContent(ndT);

	this.ptSize = PtXMLSizeDef(nd, ss.ptSizeDef);
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
	this.imgThumb = this.BoundPart("Thumb");
	this.imgThumb.onerror = this.FnCallBack("ThumbError");
	this.SetStatus();
}

function Slide.prototype.ThumbError()
{
	this.fThumbError = true;
}

function Slide.prototype.FLandscape()
{
	return this.ptSize.x >= this.ptSize.y;
}

function Slide.prototype.Preload()
{
	if (this.imgCache != undefined)
		return;
	this.imgCache = new Image();
	this.imgCache.onload = this.FnCallBack("Loaded");
	this.imgCache.onerror = this.FnCallBack("Error");
	this.imgCache.src = this.stSrc;
	this.ss.cslidesPre++;
}

function Slide.prototype.Loaded()
{
	this.fLoaded = true;
	this.ss.cslidesLoaded++;
	// Assume only one image is preloading at a time.
	this.ss.cslidesPre--;
	if (!this.fError)
		{
		// NOTE: If we find an incorrect image dimension in the slide show - we correct
		// it and re-layout the show.  This may not be correct as the user may want a
		// scaled image in his show....maybe this code should go.
//		if (this.imgCache.width != this.ptSize.x || this.imgCache.height != this.ptSize.y)
//			{
//			this.ptSize = new Point(this.imgCache.width, this.imgCache.height);
//			this.ss.fLayout = false;
//			}
		}
	this.SetStatus();
}

// Error loading an image.
function Slide.prototype.Error()
{
	this.fError = true;
	this.Loaded();
}

function Slide.prototype.SetStatus()
{
	var stClass = "Unloaded";
	
	if (this.fLoaded)
		stClass = "Loaded";

	if (this.fSel)
		stClass = "Selected";

	if (this.fError)
		stClass = "Error";

	this.imgThumb.className = stClass;
}
