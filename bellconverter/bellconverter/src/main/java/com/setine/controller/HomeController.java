package com.setine.controller;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import javax.servlet.http.HttpServletRequest;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.ModelAndView;

import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.setine.mariadb.model.GarlandBell;
import com.setine.mariadb.service.GarlandBellService;
import com.setine.mongodb.GarlandDAO;
import com.setine.db.model.Items;
import com.setine.db.model.Node;
import com.setine.db.model.Response;

@Controller
public class HomeController {

	@Autowired
	GarlandDAO mongoService;
	@Autowired
	GarlandBellService mariaService;
	
	@RequestMapping(value = { "/" }, method = RequestMethod.GET)
	public ModelAndView index(HttpServletRequest request, ModelMap model) throws Exception {
		GarlandBell garlandBell = new GarlandBell();
		garlandBell.setKey("1");
		garlandBell.setType("root");
		garlandBell.setIndex_en("root");
		garlandBell.setIndex_ja("root");
		garlandBell.setIndex_kr("root");
		garlandBell.setPath("root");
		mariaService.save(garlandBell);
		return new ModelAndView("index");
	}

	// POST
	@RequestMapping(value = "/process", method = RequestMethod.POST, produces = "application/json; charset=utf8")
	public @ResponseBody String update(@RequestBody String data) throws IOException {

		// set default parameters
		ObjectMapper mapper = new ObjectMapper();
		mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
		String targetUrl = "https://setine.net/ff14/dbfinder/";
		
		// parsing requestBody - bell data
		ArrayList<Node> nodesList = GarlandParsing(mapper, data);

		// main process
		for (int i = 0; i < nodesList.size(); i++) {
			// get a words from requestBody data
			String title = nodesList.get(i).getTitle(); 	// go to targetUrl
			String zone = nodesList.get(i).getZone(); 		// go to targetUrl
			String name = nodesList.get(i).getName(); 		// go to enum
			String type = nodesList.get(i).getType(); 		// go to enum
			
			// setting placename target url
			String con_title = setTargetUrl(targetUrl, title, 1, 6);
			String con_zone = setTargetUrl(targetUrl, zone, 1, 6);

			con_title = checkValid(title, getSetineResponseData(mapper, con_title));
			con_zone = checkValid(zone, getSetineResponseData(mapper, con_zone));
			
			// setting enum to default types
			
			
			// item parsing
			List<Items> itemList = nodesList.get(i).getItems();
			for (int j = 0; j < itemList.size(); j++) {
				String itemName = itemList.get(j).getItem();
				String con_itemName = setTargetUrl(targetUrl, itemName, 1, 1);
				con_itemName = checkValid(itemName, getSetineResponseData(mapper, con_itemName));
				itemList.get(j).setItem(con_itemName);
			}
			
			// return to original requestBody data
			nodesList.get(i).setTitle(con_title);
			nodesList.get(i).setZone(con_zone);
			nodesList.get(i).setName(name);
			nodesList.get(i).setType(type);
			
			// save to database
		}
		
		// return after parsing data
		mapper.setSerializationInclusion(Include.NON_NULL);
		String dtoAsString = mapper.writeValueAsString(nodesList);
		return dtoAsString;
	}
	
	// if fail to get selected Data, maintain current text
	private String checkValid(String originalData, Response parsingData) {
		String temp1 = "";
		
		try {
			temp1 = parsingData.getResult().get(0).getIndex_kr();
		} catch (Exception e) {
			temp1 = originalData;
		}
		return temp1;
	}

	// parsing from setine.net
	private Response getSetineResponseData(ObjectMapper mapper, String targetUrl) throws IOException {
		Document doc = Jsoup.connect(targetUrl)
		.userAgent(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.152 Safari/537.36")
		.ignoreHttpErrors(true).ignoreContentType(true).get();
		
		Response parsingData = SetineParsing(mapper, doc.select("body").text());
		return parsingData;
	}

	// setting targeturl
	private String setTargetUrl(String targetUrl, String title, int type, int url) {
		switch(type) {
		case 1:
			targetUrl += "question/";
			break;
		case 2:
			targetUrl += "index/";			
			break;
		}
		switch(url) {
		case 1:
			targetUrl += "item/";
			break;
		case 2:
			targetUrl += "npc/";			
		case 3:
			targetUrl += "quest/";			
		case 4:
			targetUrl += "duty/";			
		case 5:
			targetUrl += "achievement/";			
		case 6:
			targetUrl += "placename/";			
			break;
		}
		
		targetUrl += title;
		return targetUrl;
	}

	// json parsing method
	private ArrayList<Node> GarlandParsing(ObjectMapper mapper, String jsonString) throws JsonParseException, JsonMappingException, IOException {
		mapper.getTypeFactory();
		ArrayList<Node> nodesList = new ArrayList<Node>();
		
		List<Node> list = mapper.readValue(jsonString, new TypeReference<List<Node>>() { });
		nodesList = (ArrayList<Node>) list;
		return nodesList;
	}

	// json parsing method
	private Response SetineParsing(ObjectMapper mapper, String jsonString) throws JsonParseException, JsonMappingException, IOException {
		Response value = new Response();
		value = mapper.readValue(jsonString, Response.class);
		return value;
	}
}
