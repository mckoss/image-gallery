// ------------------------------------------------------------
// util.js
//
// Copyright, 2003-2004 by Mike Koss (mike04@mckoss.com)
//
// History:
//
// January 31, 2004 [mck] Added Point and Rect utilities for object positioning.
// November 28, 2003 [mck] Copied base JScript utilities from object.js.
//
// This file contains utilities for enabling a richer object-oriented code in JScript
// as well as helper functions for string processing, collections (Bag's), and absolute
// positioned DHTML.
// ------------------------------------------------------------
// Header template - copy me
// -----------------------------------------------------mck----
var cbUtil = new CodeBase("util.js");

// ------------------------------------------------------------
// CodeBase - determine location of script file
// -----------------------------------------------------mck----

function CodeBase(stScript)
{
	var stPath;
	var ichFile;

	for (i = 0; i < document.scripts.length; i++)
		{
		stPath = document.scripts(i).src;
		ichFile = stPath.indexOf(stScript, 0);
		if (ichFile >= 0)
			{
			this.stPath = stPath.substring(0, ichFile);
			if (this.stPath.indexOf("http://") == 0)
				this.stDomain = this.stPath.substring(7);
			break;
			}
		}
}

function CodeBase.prototype.StIncludeScript(stFile)
{
	var st = "";
	st +=  "<" + "SCRIPT SRC=" + StAttrQuote(this.stPath + stFile);
	st += "></" + "SCRIPT>";
	return st;
}

function CodeBase.prototype.IncludeScript(stFile)
{
	document.write(this.StIncludeScript(stFile));
}

function CodeBase.prototype.IncludeStyle(stFile)
{
	document.createStyleSheet(this.stPath + stFile);
}

// ------------------------------------------------------------
// Object Orientation Functions
// -----------------------------------------------------mck----

// Copy all base class methods that do not have a definition in the current
// constructor prototype.  Also add a prototype variable that references to
// base class's constructor by name
function Function.prototype.DeriveFrom(fnBase)
{
	var prop;

	if (this == fnBase)
		{
		alert("Error - cannot derive from self");
		return;
		}

	for (prop in fnBase.prototype)
		{
		if (typeof(fnBase.prototype[prop]) == "function" && !this.prototype[prop])
			{
			this.prototype[prop] = fnBase.prototype[prop];
			}
		}

	this.prototype[fnBase.StName()] = fnBase;
}

function Function.prototype.StName()
{
	var st;

	st = this.toString();
	st = st.substring(st.indexOf(" ")+1, st.indexOf("("));

	return st;
}

// Give subclass access to parent's method, via Parent_Method() like call.
function Function.prototype.Override(fnBase, stMethod)
{
	this.prototype[fnBase.StName() + "_" + stMethod] = fnBase.prototype[stMethod];
}

function Function.prototype.StParams()
{
	var st;

	st = this.toString();
	st = st.substring(st.indexOf("("), st.indexOf(")")+1);
	return st;
}


// ------------------------------------------------------------
// Named - Base class for jsavascript objects that need scriptable names
//
// Derive from the Named object for any object that you want to have a script-evalable name
// (these are often needed in attributes added to browser elements for click events, timer callbacks etc.)
//
// e.g.
// MyObj.DeriveFrom(Named);
// function MyObj()
// {
//     this.Named();
//     ...
// }
// "<IMG onclick=" + StAttrQuote(this.StNamed() + ".Callback();") + ">"
// -----------------------------------------------------mck----

Named.idNext = 0;
Named.rg = new Array;

function Named()
{
	this.idNamed = Named.idNext++;
	Named.rg[this.idNamed] = this;
}

// Name for the JS object
function Named.prototype.StNamed()
{
	return "Named.rg[" + this.idNamed + "]";
}

// Produce DHTML name for web component associated with this JS object
function Named.prototype.StNamedPart(stPart, iPart)
{
	var st;

	st = "NM_" + this.idNamed + "_" + stPart;
	if (iPart != undefined)
		st += "_" + iPart;
	return st;
}

function Named.prototype.StPartID(stPart, iPart)
{
	return "ID=" + StAttrQuote(this.StNamedPart(stPart, iPart));
}

function Named.prototype.BoundPart(stPart, iPart)
{
	return eval(this.StNamedPart(stPart, iPart));
}

function Named.prototype.FnCallBack(stFunc)
{
	return new Function(this.StNamed() + "." + stFunc + "();");
}

// ------------------------------------------------------------
// Misc and string quoting Functions
// -----------------------------------------------------mck----

function NYI()
{
	alert(NYI.caller.StName() + ": Not yet implemented");
}

function StAttrQuote(st)
{
	return '"' + StAttrQuoteInner(st) + '"';
}

function StAttrQuoteInner(st)
{
	st = st.toString();
	st = st.replace(/&/g, '&amp;');
	st = st.replace(/\"/g, '&quot;');	// editor confused about single quote "
	st = st.replace(/'/g, '&#39;');	// editor confused about single quote '
	st = st.replace(/\r/g, '&#13;');
	return st;
}

function DW(st)
{
	document.write(st);
}

function Array.prototype.toString()
{
	var i;
	var st = "";

	st += "[";
	for (i = 0; i < this.length; i++)
		{
		if (i != 0)
			st += ", ";
		st += this[i].toString();
		}
	st += "]";
	return st;
}

function String.prototype.StRotate(iRot)
{
	return this.substring(iRot) +  this.substring(0, iRot);
}

function String.prototype.StReplace(stPat, stRep)
{

	var st = "";

	var ich = 0;
	var ichFind = this.indexOf(stPat, 0);

	while (ichFind >= 0)
		{
		st += this.substring(ich, ichFind) + stRep;
		ich = ichFind + stPat.length;
		ichFind = this.indexOf(stPat, ich);
		}
	st += this.substring(ich);

	return st;
}

function StHTML(st)
{
	st = st.toString();
	st = st.replace(/&/g, '&amp;');
	st = st.replace(/</g, '&lt;');
	st = st.replace(/>/g, '&gt;');
	st = st.replace(/\n/g, '<br>');
	st = st.replace(/ /g, '&nbsp;');
	st = st.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
	return st;
}

function StBaseURL(stBase, stURL)
{
	if (stURL.indexOf("://", 0) < 0)
		stURL= stBase + stURL;
	return stURL;
}


function MailLink(stDomain, stUser, stName, stSubject)
{
	var st = "";

	st += "mailto:" + stDomain + "@" + stUser;
	if (stSubject != undefined)
		st += "?subject=" + stSubject;
	document.write("<A HREF=" + StAttrQuote(st) + ">" + stName + "</A>");
}

function URLNav(stOther)
{
	var stURL = stOther;

	if (stURL == undefined)
		stURL = document.location.href;

	this.mpParam = new Object;

	var ich = stURL.indexOf("?");
	if (ich == -1)
		ich = stURL.length;
	this.stBase = stURL.substring(0, ich);

	while (ich < stURL.length)
		{
		ich++;
		ichVar = stURL.indexOf("=", ich);
		ichEnd = stURL .indexOf("&", ich);
		if (ichEnd == -1)
			ichEnd = stURL.length;
		if (ichVar != -1)
			{
			var stParam = stURL.substring(ich, ichVar);
			stParam = decodeURIComponent(stParam);
			var stValue = stURL.substring(ichVar+1, ichEnd);
			stValue = decodeURIComponent(stValue);
			this.SetParam(stParam, stValue);
			}
		ich = ichEnd;
		}
}

function URLNav.prototype.StParam(stParam)
{
	return this.mpParam[stParam];

}

function URLNav.prototype.SetParam(stParam, stValue)
{
	this.mpParam[stParam] = stValue;
}

function URLNav.prototype.StURL()
{
	var stURL = this.stBase;
	var fFirst = true;

	for (stParam in this.mpParam)
		{
		if (!this.mpParam.hasOwnProperty(stParam))
			continue;

		stURL += fFirst ? "?" : "&";
		fFirst = false;
		stURL += encodeURIComponent(stParam) + "=" + encodeURIComponent(this.StParam(stParam));
		}
	return stURL;
}


// ------------------------------------------------------------
// BAG - Supports collections of objects and enumeration
// -----------------------------------------------------mck----
Bag.idNext = 0;

function Bag()
{
	this.rg = new Array;
	this.stName = "Bag" + Bag.idNext++;
	this.idNext = 0;
	this.c = 0;
}

function Bag.prototype.Add(obj)
{
	// Already a member of this bag
	if (obj[this.stName] != undefined)
		return;

	this.rg[this.idNext] = obj;
	obj[this.stName] = this.idNext;
	this.idNext++;
	this.c++;
}

function Bag.prototype.Remove(obj)
{
	var id = obj[this.stName];

	// Not in this bag
	if (id == undefined)
		return;

	this.rg[id] = undefined;
	this.c--;
}

function Bag.prototype.FMember(obj)
{
	return obj[this.stName] != undefined;
}

//
// IBag - Iterator for Bag's
//

function IBag(bag)
{
	this.bag = bag;
	this.Init();
}

function IBag.prototype.Init()
{
	this.i = -1;
}

function IBag.prototype.FNext()
{
	while (++this.i < this.bag.rg.length)
		{
		if (this.bag.rg[this.i] != undefined)
			return true;
		}
	return false;
}

function IBag.prototype.Obj()
{
	if (this.i == -1)
		this.FNext();
	return this.bag.rg[this.i];
}

// ------------------------------------------------------------
// FileLoad - Allows reading files into JScript programs
// -----------------------------------------------------mck----

FileLoad.DeriveFrom(Named);

function FileLoad()
{
	this.Named();

	this.id = FileLoad.idNext++;
	FileLoad.rgfl[this.id] = this;
}

function FileLoad.prototype.StUI()
{
	var st = "";

	st += "<IFRAME ";
	st += "style=display:none ";
	st += this.StPartID("Frame");
	st += " onload=" + StAttrQuote(this.StNamed() + ".Loaded(); ");
	st += "></IFRAME>";
	return st;
}

function FileLoad.prototype.BindUI()
{
	this.frData = this.BoundPart("Frame");
}

function FileLoad.prototype.WriteUI()
{
	DW(this.StUI());
	this.BindUI();
}

function FileLoad.prototype.GetFile(stFile, fnCallback)
{
	this.frData.document.location = stFile;
	this.fnCallBack = fnCallback;
	this.fLoaded = false;
}

function FileLoad.prototype.Loaded()
{
	this.fLoaded = true;
	if (this.fnCallBack != undefined)
		this.fnCallBack(this);
}

function FileLoad.prototype.StFile()
{
	if (!this.fLoaded)
		return "";

	return this.frData.document.body.innerText;
}

// ------------------------------------------------------------
// Geometrical and element positioning primitives
//
// Point - pt.x, pt.y
// Rect - rc.ptUL, rc.ptLR
// -----------------------------------------------------mck----//

function Point(x, y)
{
	this.x = x;
	this.y = y;
}

function Point.prototype.FEqual(pt)
{
	return (this.x == pt.x && this.y == pt.y);
}

function Point.prototype.FLEThan(pt)
{
	return this.x <= pt.x && this.y <= pt.y;
}

function Point.prototype.Clone()
{
	return new Point(this.x, this.y);
}

function Point.prototype.Negate()
{
	this.x = -this.x;
	this.y = -this.y;
}

function Point.prototype.Floor()
{
	this.x = Math.floor(this.x);
	this.y = Math.floor(this.y);
}

function Point.prototype.Add(pt)
{
	this.x += pt.x;
	this.y += pt.y;
}

function Point.prototype.Offset(dx, dy)
{
	this.x += dx;
	this.y += dy;
}

function Point.prototype.Sub(pt)
{
	this.x -= pt.x;
	this.y -= pt.y;
}

function Point.prototype.Min(pt)
{
	this.x = Math.min(this.x, pt.x);
	this.y = Math.min(this.y, pt.y);
}

function Point.prototype.Max(pt)
{
	this.x = Math.max(this.x, pt.x);
	this.y = Math.max(this.y, pt.y);
}

function Point.prototype.Mult(num)
{
	this.x *= num;
	this.y *= num;
}

// Return the max scale factor that keeps each dimension less than or equal
// to a target size.
function Point.prototype.ScaleTo(ptT)
{
	return Math.min(ptT.x / this.x, ptT.y / this.y);
}

function Rect(ptUL, ptLR)
{
	if (ptUL == undefined)
		this.ptUL = new Point(0,0);
	else
		this.ptUL = ptUL.Clone();

	if (ptLR == undefined)
		ptLR = this.ptUL;

	this.ptLR = ptLR.Clone();
}

function Rect.prototype.Clone()
{
	return new Rect(this.ptUL, this.ptLR);
}

function Rect.prototype.Offset(dx, dy)
{
	this.ptUL.Offset(dx, dy);
	this.ptLR.Offset(dx, dy);
}

function Rect.prototype.Add(ptD)
{
	this.ptUL.Add(ptD);
	this.ptLR.Add(ptD);
}

function Rect.prototype.Sub(ptD)
{
	this.ptUL.Sub(ptD);
	this.ptLR.Sub(ptD);
}

function Rect.prototype.Union(rc)
{
	this.ptUL.Min(rc.ptUL);
	this.ptLR.Max(rc.ptLR);
}

function Rect.prototype.BBox(pt)
{
	this.ptUL.Min(pt);
	this.ptLR.Max(pt);
}

function Rect.prototype.PtCenter()
{
	var ptCenter = this.ptUL.Clone();
	ptCenter.Add(this.ptLR);
	ptCenter.Mult(1/2);
	return ptCenter;
}

function Rect.prototype.CenterOn(ptCenter)
{
	this.MoveTo(ptCenter, this.PtCenter());
}

// Move the rectangle so that the upper left corner (OR the given source point)
// is reposition to the Target location.
function Rect.prototype.MoveTo(ptTarget, ptSrc)
{
	var pt;
	pt = ptTarget.Clone();
	if (!ptSrc)
		pt.Sub(this.ptUL);
	else
		pt.Sub(ptSrc);
	this.Add(pt);
}

function Rect.prototype.PtSize()
{
	var ptSize = this.ptLR.Clone();
	ptSize.Sub(this.ptUL);
	return ptSize;
}

function Rect.prototype.Dx()
{
	return this.ptLR.x - this.ptUL.x;
}

function Rect.prototype.Dy()
{
	return this.ptLR.y - this.ptUL.y;
}

// Rectangles must include at least 1 pixel of OVERLAP to be considered intersecting
// (not merely coincident on one edge).
function Rect.prototype.FIntersect(rc)
{
	return (FIntersectRange(this.ptUL.x, this.ptLR.x, rc.ptUL.x, rc.ptLR.x) &&
			FIntersectRange(this.ptUL.y, this.ptLR.y, rc.ptUL.y, rc.ptLR.y));
}

function Rect.prototype.FContainsPt(pt)
{
	return (pt.x >= this.ptUL.x && pt.x <= this.ptLR.x &&
		pt.y >= this.ptUL.y && pt.y <= this.ptLR.y);
}

function Rect.prototype.FContainsRc(rc)
{
	return (this.FContainsPt(rc.ptUL) && this.FContainsPt(rc.ptLR));
}

function FIntersectRange(x1Min, x1Max, x2Min, x2Max)
{
	return x1Max > x2Min && x2Max > x1Min;
}

function Rect.prototype.PtUR()
{
	return new Point(this.ptLR.x, this.ptUL.y);
}

function Rect.prototype.PtLL()
{
	return new Point(this.ptUL.x, this.ptLR.y);
}

// Map to an interior portion of the rectangle - proportional to numX and numY [0..1]
// for all points in the interior.
function Rect.prototype.PtMap(numX, numY)
{
	var dpt = this.ptLR.Clone();
	dpt.Sub(this.ptUL);
	dpt.x *= numX;
	dpt.y *= numY;
	dpt.Add(this.ptUL);
	return dpt;
}

// Get absolute position on the page for the upper left of the element.
function PtAbsolute(elt)
{
	var pt = new Point(0,0);

	while (elt.offsetParent != null)
		{
		pt.x += elt.offsetLeft;
		pt.y += elt.offsetTop;
		elt = elt.offsetParent;
		}
	return pt;
}

// Return size of a DOM element in a Point - includes borders, but not margins
function PtSize(elt)
{
	return new Point(elt.offsetWidth, elt.offsetHeight);
}

// Return aboslute bounding rectangle for a DOM element
function RcAbsolute(elt)
{
	var rc = new Rect;
	rc.ptUL = PtAbsolute(elt);
	rc.ptLR = rc.ptUL.Clone();
	rc.ptLR.Add(PtSize(elt));
	return rc;
}

// Set DOM element absolution position
function PositionElt(elt, pt)
{
	// assumes elt.style.position = "absolute"
	elt.style.pixelLeft = pt.x;
	elt.style.pixelTop = pt.y;
}

// Set DOM element size
function SizeElt(elt, pt)
{
	if (pt.x != undefined)
		elt.style.pixelWidth = pt.x;
	if (pt.y != undefined)
		elt.style.pixelHeight = pt.y;
}

// Set DOM element Rect
function SetEltRect(elt, rc)
{
	PositionElt(elt, rc.ptUL);
	SizeElt(elt, rc.PtSize());
}

//
// Timer class supports periodic execution of a snippet of jscript code.
//
Timer.DeriveFrom(Named);

function Timer(fnCallBack, ms, fOneShot)
{
	this.Named();

	this.ms = ms;
	this.fnCallBack = fnCallBack;
	this.iPing = 0;
	this.fOneShot = fOneShot;
}

function Timer.prototype.Ping()
{
	if (this.fOneShot)
		this.Active(false);
	this.fnCallBack();
}

// Calling Active resets the timer so that next call to Ping will be in this.ms milliseconds from NOW
function Timer.prototype.Active(fActive)
{
	if (this.iTimer)
		{
		clearInterval(this.iTimer);
		this.iTimer = undefined;
		}

	if (fActive)
		this.iTimer = setInterval(this.StNamed() + ".Ping();", this.ms);
}

function Timer.prototype.FActive()
{
	return this.iTimer != undefined;
}

// ------------------------------------------------------------
// Button - creates on-screen UI for calling a function
// -----------------------------------------------------mck----
Button.DeriveFrom(Named);

function Button(stLabel, stCode, stImg1, stImg2, stTitle)
{
	this.Named();
	this.stLabel = stLabel;
	this.stCode = stCode;
	this.fText = (stImg1 == undefined);
 	this.stImg1 = stImg1;
	this.stImg2 = stImg2;
	this.stTitle = stTitle;
	this.fToggle = false;
	this.fCapture = false;
	this.fAlpha = stImg1 && stImg1.indexOf(".png", 0) > 0;
	if (this.fAlpha)
		{
		// Load the images so we can get the width/height
		this.img1 = new Image();
		this.img1.onload = this.FnCallBack("ImgLoaded");
		this.fLoaded = false;
		this.img1.src = stImg1;

		if (this.stImg2)
			{
			this.img2 = new Image();
			this.img2.src = stImg2;
			}
		}
}

function Button.prototype.SetHeight(dy)
{
	this.dyTarget = dy;
}

function Button.prototype.StUI()
{
	var st = "";

	if (this.fText)
		{
		st += "<INPUT " + this.StPartID("Button") + " TYPE=Button class=TextButton Value=" + StAttrQuote(this.stLabel);
		if (this.stTitle != undefined)
			st += " TITLE=" + StAttrQuote(this.stTitle);
		st += " onclick=" + StAttrQuote(this.stCode) + ">";
		return st;
		}

	st += "<IMG " + this.StPartID("Button") + " class=ImgButton SRC=";
	if (this.fAlpha)
		{
		st += StAttrQuote(cbUtil.stPath + "images/blank.gif");
		}
	else
		st +=  StAttrQuote(this.stImg1);
	if (this.stTitle != undefined)
		st += " TITLE=" + StAttrQuote(this.stTitle);

	st += ">";

	return st;
}

function Button.prototype.BindUI()
{
	this.btn = this.BoundPart("Button");
	if (!this.fText)
		{
		this.btn.onmousedown = this.FnCallBack("MouseDown");
		this.btn.onmousemove = this.FnCallBack("MouseMove");
		this.btn.onmouseup = this.FnCallBack("MouseUp");
		// Bug: The order of events leading to the ondblclick event is onmousedown, onmouseup, onclick,
		// onmouseup, and then ondblclick - we still have a bug since we do not get the second mouse
		// down that we don't paint the button in the down position - but we do execture the second command
		// on the double click message.
		this.btn.ondblclick = this.FnCallBack("DoubleClick");
		this.btn.onlosecapture = this.FnCallBack("LoseCapture");
		}
	this.SizeButton();
	this.ButtonDown(false);
}

function Button.prototype.SizeButton()
{
	if (!this.fLoaded || this.btn == undefined)
		return;

	var wScale = 1.0;
	if (this.dyTarget != undefined)
		wScale = this.dyTarget/this.img1.height;

	this.btn.style.pixelWidth = this.img1.width * wScale;
	this.btn.style.pixelHeight = this.img1.height * wScale;
}

function Button.prototype.ImgLoaded()
{
	this.fLoaded = true;
	this.SizeButton();
}

function Button.prototype.ButtonDown(fDown)
{
	if (fDown == this.fDown)
		return;

	this.fDown = fDown;
	if (this.fText)
		return;

	var stImg = (fDown && this.stImg2) ? this.stImg2 : this.stImg1;

	if (this.fAlpha)
		{
		var st = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src=" + StAttrQuote(stImg) + ", sizingMethod=scale)";
		this.btn.style.filter = st;
		}
	else
		this.btn.src = stImg;
}

function Button.prototype.MouseDown()
{
	this.fCapture = true;
	this.rc = RcAbsolute(this.btn);
	this.btn.setCapture();
	this.ptMouse = new Point(0,0);
	this.fDownCap = this.fDown;
	this.ButtonDown(!this.fDownCap);
}

function Button.prototype.MouseMove()
{
	if (!this.fCapture)
		return;

	// Convert window coordinates to document coordinates
	this.ptMouse.x = event.clientX + document.body.scrollLeft;
	this.ptMouse.y = event.clientY + document.body.scrollTop;

	this.ButtonDown(this.rc.FContainsPt(this.ptMouse) ^ this.fDownCap);
}

function Button.prototype.LoseCapture()
{
	this.fCapture = false;
	this.ButtonDown(this.fDownCap);
}

function Button.prototype.MouseUp()
{
 	if (this.fDown == this.fDownCap)
 		{
 		document.releaseCapture();
		return;
 		}

	if (this.fToggle)
		this.fDownCap = !this.fDownCap;
	document.releaseCapture();
	eval(this.stCode);
}

function Button.prototype.DoubleClick()
{
	eval(this.stCode);
}

// ------------------------------------------------------------
// XML Utility functions
//
// Used for reading XML data islands
// -----------------------------------------------------mck----

function XMLFromURL(stURL)
{
	var xml = new ActiveXObject("Msxml2.DOMDocument");
	xml.async = false;
	xml.resolveExternals = false;
	xml.load(stURL);

	return xml;
}

function StXMLError(xml)
{
	var stError = "";
	var err = xml.parseError;

	if (err.errCode != 0)
		{
		stError += "Parse Error in XML line number " + err.line + " (character " + err.linepos + "):\n";
		if (err.url)
			stError += "File: " + err.url + "\n";
		stError += "\n";
		stError += err.srcText.substr(0, err.linepos-1);
		stError += "/\\";
		stError += err.srcText.substr(err.linepos-1);
		stError += "\n\n" + err.reason;
		}

	return stError;
}

// Collect the text of all enclosed child nodes
function StXMLContent(nd)
{
	var i;
	var st = "";

	if (!nd)
		return st;

	for (i = 0; i < nd.childNodes.length; i++)
		{
		st += nd.childNodes.item(i).xml;
		}
	return st;
}

// Read an attribute from a node, and provide a default value for a missing attribute
// fNum=undefined/false: Treat as string
// fNum=true: Treat as (floating point) number
// fNum=2: Treat as Boolean!
function XMLAttrDef(nd, stAttr, def)
{
	if (!nd) return def;

	var stValue = nd.getAttribute(stAttr);

	if (stValue == undefined)
		return def;

	if (typeof(def) == "boolean")
		{
		var f;
		stValue = stValue.toUpperCase();
		f = stValue == "TRUE" || stValue == "ON" || stValue == "YES";
		return f;
		}

	if (typeof(def) == "number")
		return parseFloat(stValue);

	return stValue;
}

function PtXMLSizeDef(nd, ptDef, stPrefix)
{
	if (stPrefix == undefined)
		stPrefix = "";
	var ptSize = new Point(XMLAttrDef(nd, stPrefix + "Width", ptDef.x),
		XMLAttrDef(nd, stPrefix + "Height", ptDef.y));
	return ptSize;
}


// ------------------------------------------------------------
// Object dump routines (for debugging)
// -----------------------------------------------------mck----

var DumpCtx = new Object;
DumpCtx.iDepth = 0;
DumpCtx.iDepthMax = 3;
DumpCtx.fProto = false;

function Object.prototype.StDump()
{
	var st = "";
	var cProps = 0;
	var prop;

	if (DumpCtx.iDepth > DumpCtx.iDepthMax)
		{
		st += " '" + this.toString() + "'";
		return st;
		}

	if (this.constructor == undefined)
		return "ActiveX Control";

	DumpCtx.iDepth++;

	// All own properties
	for (prop in this)
		{
		if (this.hasOwnProperty(prop))
			{
			st += StDumpVar(prop, this[prop]);
			cProps++;
			}
		}

	DumpCtx.iDepth--;
	if (cProps == 0)
		return "";
	return st;
}

function StDumpVar(stVar, value)
{
	var st = "\n";

	for (i = 1 ; i < DumpCtx.iDepth; i++)
		st += "  ";

	st += stVar + ": " ;
	if (value == undefined)
		{
		st += "UNDEFINED";
		}
	else if (typeof(value) == "object")
		{
		if (value.constructor != undefined)
			st += value.StDump();
		else
			st += "ActiveX Control";
		}
	else if (typeof(value) == "function")
		{
		stT = value.toString();
		st += stT.substring(0, stT.indexOf("("));
		}
	else
		st += value.toString();
	return st;
}

// Dump the properties of a DHTML element by enumerating all properties
function StDumpAttrs(nd)
{
	var i;
	var st = "";
	var attr;

	for (i = 0; i < nd.attributes.length; i++)
		{
		attr = nd.attributes(i);
		if (attr.nodeValue != null && attr.nodeValue != "")
			st += attr.nodeName + ": " + attr.nodeValue + "\n";
		}

	return st;
}

// ------------------------------------------------------------
// Window Control - window manipulation and sizing functions
// -----------------------------------------------------mck----
WindowControl.DeriveFrom(Named);

function WindowControl(wnd, fRecalibrate)
{
	this.Named();

	if (fRecalibrate == undefined)
		fRecalibrate = false;
	this.fRecalibrate = fRecalibrate;

	this.wnd = wnd ? wnd : window;
	this.ptScreen = new Point(screen.availWidth, screen.availHeight);
	this.rcScreen = new Rect(undefined, this.ptScreen);

	this.wnd.onresize = this.FnCallBack("Resize");
	this.Refresh();

	this.Calibrate();
}

function WindowControl.prototype.Resize()
{
	this.Refresh();
	if (this.fnResize)
		this.fnResize();
}

function WindowControl.prototype.Refresh()
{
	this.ptUL = new Point(this.wnd.screenLeft, this.wnd.screenTop);
	this.ptClientSize = new Point(document.body.clientWidth, document.body.clientHeight);
	this.ptScroll = new Point(this.wnd.document.body.scrollLeft, this.wnd.document.body.scrollTop);

	this.rcClient = new Rect(undefined, this.ptClientSize);
	this.rcOnScreen = this.rcClient.Clone();

	this.rcClient.Add(this.ptScroll);
	this.rcOnScreen.Add(this.ptUL);
}

// Use Win XP SP2 minimal window as standard control assumptions
WindowControl.ptOffset = new Point(4, 30);
WindowControl.ptControls = new Point(12, 38);

// Temporarily move and resize the window, so I can get the dimensions of the controls
// around the window (to ultimately compute the max visible area in the window).  We
// guess first at values for ptOffset and ptControls - if we're right, the window will not
// in fact move at all (if it does move/size, we correct our guess).
function WindowControl.prototype.Calibrate()
{
	var rcScreenSav = this.rcOnScreen.Clone();
	var fRecalSav = this.fRecalibrate;

	// Guess includes title bar, menu bar, address bar, google toolbar, status bar, and vertical scroll bar
	this.ptOffset = WindowControl.ptOffset.Clone();
	this.ptControls = WindowControl.ptControls.Clone();

	if (this.fRecalibrate)
		{
		this.fRecalibrate = false;
		// Move the window to the original to see how but ptOffset is (title bar, toolbar, etc).
		var ptULStart = this.ptUL.Clone();
		this.MoveTo(ptULStart);
		ptULStart.Sub(this.ptUL);
		this.ptOffset.Sub(ptULStart);

		var ptClientStart = this.ptClientSize;
		this.SizeTo(this.ptClientSize);
		ptClientStart.Sub(this.ptClientSize);
		this.ptControls.Add(ptClientStart);

		// Save new default assumptions
		WindowControl.ptOffset = this.ptOffset.Clone();
		WindowControl.ptControls = this.ptControls.Clone();

//		alert("ptOffset: " + this.ptOffset.StDump() + "\nptControls:" + this.ptControls.StDump());
		this.SetRc(rcScreenSav);
		}

	this.ptMaxVisSize = this.ptScreen.Clone();
	this.ptMaxVisSize.Sub(this.ptControls);

	this.fRecalibrate = fRecalSav;
}

function WindowControl.prototype.FFitsScreen(ptSize)
{
	return ptSize.FLEThan(this.ptMaxVisSize);
}

function WindowControl.prototype.FFitsWindow(ptSize)
{
	this.Refresh();
	return ptSize.FLEThan(this.ptClientSize);
}

// Resize the client area to the desired size (takes into account the total window size)
function WindowControl.prototype.SizeTo(ptSize)
{
	var ptOrig = ptSize.Clone();
	ptOrig.Floor();
	var pt = ptOrig.Clone();
	pt.Add(this.ptControls);

	this.wnd.resizeTo(pt.x, pt.y);

	this.Refresh();

	// If a feature of the window has changed - our calibration may be wrong - try one recalibration
	// to see if the adjustment can be made.
	if (!ptOrig.FEqual(this.ptClientSize) && this.fRecalibrate)
		{
		this.fRecalibrate = false;
		this.Calibrate();
		this.SizeTo(ptSize);
		this.fRecalibrate = true;
		}
}

// Moves the UL of the client area to the given screen point (takes into account offset between client area and top left of window)
function WindowControl.prototype.MoveTo(ptMove)
{
	var ptOrig = ptMove.Clone();
	ptOrig.Floor();
	var ptT = ptOrig.Clone();
	ptT.Sub(this.ptOffset);

	this.wnd.moveTo(ptT.x, ptT.y);

	this.Refresh();

	// If a feature of the window has changed - our calibration may be wrong - try one recalibration
	// to see if the adjustment can be made.
	if (!ptOrig.FEqual(this.ptUL) && this.fRecalibrate)
		{
		this.fRecalibrate = false;
		this.Calibrate();
		this.MoveTo(ptMove);
		this.fRecalibrate = true;
		}

}

function WindowControl.prototype.ScrollTo(pt)
{
	this.wnd.scrollTo(pt.x, pt.y);
	this.Refresh();
}

function WindowControl.prototype.SetRc(rc)
{
	this.MoveTo(rc.ptUL);
	this.SizeTo(rc.PtSize());
}

function WindowControl.prototype.PtToScreen(pt)
{
	pt.Sub(this.ptScroll);
	pt.Add(this.ptUL);
}

// ------------------------------------------------------------
// Sound -Allows for control of sound files
// -----------------------------------------------------mck----

Sound.DeriveFrom(Named)

Sound.psStopped = 1;
Sound.psPaused = 2;
Sound.psPlaying = 3;
Sound.psMediaEnded = 8;

function Sound(stSrc, fnEndMedia)
{
	this.Named();
	this.stSrc = stSrc;
	this.fLoading = false;
	this.vol = 100;
	this.fLoop = false;
	this.timer = new Timer(this.FnCallBack("Ping"), 300);
	this.fnEndMedia = fnEndMedia;
}

function Sound.prototype.StUI()

// *** Made a bunch of changes to correct WMP 7.1 overlay issue - msj 8-14/04
{
	var st = "";

	// Note: Media Player Version 9 class ID here.
	// May want to switch to older version that had a CODEBASE supported parameter for
	// auto-download.
	// CLASSID="CLSID:22d6f312-b0f6-11d0-94ab-0080c74c7e95"
	// CODEBASE="http://activex.microsoft.com/activex/controls/mplayer/en/nsmp2inf.cab#Version=5,1,52,701"

	st += "<OBJECT  " + this.StPartID("Player");
//  *** removed style='display:none;'
	st += " CLASSID='CLSID:6BF52A52-394A-11d3-B153-00C04F79FAA6' WIDTH='0' HEIGHT='0'>" // *** added w and h
	st += " <PARAM NAME='autoStart' VALUE='false'>";   // *** corrected non-quoted parameters

//	*** tried below - didn't help but probably don't hurt either
//	st += " <PARAM NAME='ShowDisplay' VALUE='false'>";
//	st += " <PARAM NAME='DisplayMode' VALUE='false'>";
//	st += " <PARAM NAME='ShowControls' VALUE='false'>";

	st += "</OBJECT>";

	st += "<SCRIPT FOR=" + this.StNamedPart("Player") + " EVENT='PlayStateChange(state)'>";
	st += this.StNamed() + ".StateChange(state);";
	st += "</SCRIPT>";       // *** missing semi-colon, surprised it wasn't failing
	return st;
}

function Sound.prototype.BindUI()
{
	this.player = this.BoundPart("Player");
	this.SetVolume(100);
	if (this.fLoop)
		this.player.settings.setMode("loop", true);
	this.player.controls.pause();
	this.fPlay = false;
}

function Sound.prototype.StateChange(state)
{
	// Play can be paused in a race condition.  We tell the player to pause, but it's not started playing yet.
	// So here, we detect starting to play when we're not supposed to be, and again pause the player.
	if (state == Sound.psPlaying && !this.fPlay)
		this.player.controls.pause();

	// On "media end", alert call-back that we're done playing
	if (state == Sound.psMediaEnded && this.fPlay && !this.fLoop)
		{
		this.fPlay = false;
		if (this.fnEndMedia)
			this.fnEndMedia();
		}
}

// Set sound volume to ramp (linearly) to new volume [0..100] over time given (sec).
function Sound.prototype.RampVolume(vol, sec, fnCallback)
{
	var msNow = new Date().getTime();

	this.msStart = msNow;
	this.msEnd = msNow + sec*1000;
	this.volStart = this.vol;
	this.volEnd = vol;
	this.fnCallback = fnCallback;

	this.timer.Active(true);
}

function Sound.prototype.Mute(fMute)
{
	this.player.settings.mute = fMute;
}

function Sound.prototype.Load()
{
	if (this.fLoading)
		return
	this.fLoading = true;
// This old code only supported by WMP 9.0 and higher - use player.URL (supported by 7.0 and higher)
//	this.media = this.player.newMedia(this.stSrc);
//	this.player.currentMedia = this.media;
	this.player.URL = this.stSrc;
}

function Sound.prototype.Play(fPlay)
{
	// Without this line, repeated called to Play(true) were causing sporadic stuttering
	// of the audio playback (due to repeated calls to controls.play!)
	if (fPlay == this.fPlay)
		return;
	this.fPlay = fPlay;

	if (fPlay)
		{
		this.Load();
		this.player.controls.play();
		}
	else
		{
		this.player.controls.pause();
		}
}

function Sound.prototype.FPlaying()
{
	var state = this.player.playState;
	return state == Sound.psPlaying;
}

function Sound.prototype.SetVolume(volNew)
{
	this.player.settings.volume = volNew;
}

function Sound.prototype.Ping()
{
	var msNow = new Date().getTime();

	var volNew = NumProportion(msNow, this.msStart, this.msEnd, this.volStart, this.volEnd);
	this.SetVolume(volNew);

	if (msNow > this.msEnd)
		{
		this.timer.Active(false);
		if (this.fnCallback)
			this.fnCallback();
		}
}

// ------------------------------------------------------------
// NumProportion - Return a scaled value where source range is mapped
// to an output range (linear interpolation).
// -----------------------------------------------------mck----
function NumProportion(numIn, numInMin, numInMax, numOutMin, numOutMax)
{
	var num;

	if (numIn <= numInMin) return numOutMin;
	if (numIn >= numInMax) return numOutMax;
	num = (numIn - numInMin) * (numOutMax-numOutMin) / (numInMax-numInMin) + numOutMin;
	return num;
}

// ------------------------------------------------------------
// StatusMsg - Handle mutliple levels of status messages being displayed
// to the user.  To have status displayed in a DHTML element, pass in the
// element as an arugment.  Othewise, the status bar is used.
//
// Each status message belongs in a "slot" - any key can be used.  Each slot
// can contain one text string.  All slots are concatenated together to display
// the user-visible status message.
// -----------------------------------------------------mck----
function StatusMsg(txtStat)
{
	this.txtStat = txtStat;
	this.mpStatus = new Object;
	this.stLast = "";
}

function StatusMsg.prototype.SetStatus(stSlot, stMsg)
{
	if (stMsg == null || stMsg == undefined || (typeof(stMsg) == "string" && stMsg == ""))
		this.mpStatus[stSlot] = undefined;
	else
		this.mpStatus[stSlot] = stMsg;
	this.Display();
}

function StatusMsg.prototype.StDisplay()
{
	var st = "";
	var stSlot;

	for  (stSlot in this.mpStatus)
		{
		if (!this.mpStatus.hasOwnProperty(stSlot))
			continue;

		if (this.mpStatus[stSlot] != undefined)
			{
			if (st != "")
				st += " - ";
			st += stSlot + ": " + this.mpStatus[stSlot];
			}
		}

	return st;
}

function StatusMsg.prototype.Display()
{
	var st = this.StDisplay();

	if (this.txtStat != undefined)
		this.txtStat.innerText = st;
	else
		{
		if (this.stLast != st)
			status = st;
		}
	this.stLast = st;
}

// ------------------------------------------------------------
// DragController - Class enables a web document to be scrolled "by hand"
// -----------------------------------------------------mck----

DragController.DeriveFrom(Named);
function DragController(obj)
{
	this.Named();

	this.obj = obj;
	obj.style.cursor = "move";
	this.fDown = false;
	this.fThrow = false;

	obj.onmousedown = this.FnCallBack("MouseDown");
	obj.onmousemove = this.FnCallBack("MouseMove");
	obj.onmouseup = this.FnCallBack("MouseUp");
	obj.onkeydown = this.FnCallBack("KeyDown");

	this.msIdle = 1;
	this.friction = 0.97;
	this.tm = new Timer(this.FnCallBack("Idle"), this.msIdle);
}

function DragController.prototype.Throw(fThrow)
{
	if (this.fThrow == fThrow)
		return;
	this.fThrow = fThrow;

	this.tm.Active(fThrow);
}

function DragController.prototype.Idle()
{
	scrollBy(this.dx, this.dy);
	this.dx *= this.friction;
	this.dy *= this.friction;
	if (Math.abs(this.dx) < 1 && Math.abs(this.dy) < 1)
		this.Throw(false);
}

function DragController.prototype.MouseDown()
{
	if (event.srcElement.tagName.toUpperCase() == "AREA")
		{
		return;
		}
	this.obj.setCapture();
	this.fDown = true;
	this.Throw(false);
	this.RecordMouse(true);
}

function DragController.prototype.MouseMove()
{
	if (!this.fDown)
		return;

	// Bug - we somehow got a mousedown and no mouseup
	if (event.button == 0)
		{
		this.MouseUp();
		return;
		}

	this.RecordMouse(false);

	scrollBy(this.dx, this.dy);
}

function DragController.prototype.RecordMouse(fInit)
{
	if (fInit)
		{
		this.dx = this.dy = 0;
		}
	else
		{
		this.dx = this.x - event.clientX;
		this.dy = this.y - event.clientY;
		}

	this.x = event.clientX;
	this.y = event.clientY;
}

function DragController.prototype.MouseUp()
{
	this.obj.releaseCapture();
	this.fDown = false;
	this.Throw(true);
}

function DragController.prototype.KeyDown()
{
	var dx = 0;
	var dy = 0;

	switch (event.keyCode)
		{
	// left arrow
	case 37:
		dx = -5;
		break;
	// right arrow
	case 39:
		dx = 5;
		break;
	// up arrow
	case 38:
		dy = -5;
		break;
	// down arrow
	case 40:
		dy = 5;
		break;
	// page up
	case 33:
		dy = -10;
		break;
	// page down
	case 34:
		dy = 10;
		break;
	default:
		if (this.fnKey)
			this.fnKey();
		return;
		}

	event.returnValue = false;

	if (!this.fDown && !this.fThrow)
		{
		this.dx = dx;
		this.dy = dy;
		this.Throw(true);
		return;
		}

	if (this.fThrow)
		{
		this.dx += dx;
		this.dy += dy;
		}
}
