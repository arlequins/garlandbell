package com.setine.db.model;

import org.springframework.data.mongodb.core.mapping.Document;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Document
@JsonIgnoreProperties(ignoreUnknown = true)
public class Setine {
	private String key;
	private String type;
	private String index_kr;
	private String index_ja;
	private String index_en;
	private String path;

	public String getKey() {
		return key;
	}

	public void setKey(String key) {
		this.key = key;
	}

	public String getType() {
		return type;
	}

	public void setType(String type) {
		this.type = type;
	}

	public String getIndex_kr() {
		return index_kr;
	}

	public void setIndex_kr(String index_kr) {
		this.index_kr = index_kr;
	}

	public String getIndex_ja() {
		return index_ja;
	}

	public void setIndex_ja(String index_ja) {
		this.index_ja = index_ja;
	}

	public String getIndex_en() {
		return index_en;
	}

	public void setIndex_en(String index_en) {
		this.index_en = index_en;
	}

	public String getPath() {
		return path;
	}

	public void setPath(String path) {
		this.path = path;
	}

}
