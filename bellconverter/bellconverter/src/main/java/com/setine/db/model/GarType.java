package com.setine.db.model;

public class GarType {
	private String index_en;
	private String index_kr;

	public GarType(String index_en, String index_kr) {
		this.index_en = index_en;
		this.index_kr = index_kr;
	}

	public String getIndex_en() {
		return index_en;
	}

	public void setIndex_en(String index_en) {
		this.index_en = index_en;
	}

	public String getIndex_kr() {
		return index_kr;
	}

	public void setIndex_kr(String index_kr) {
		this.index_kr = index_kr;
	}
}
