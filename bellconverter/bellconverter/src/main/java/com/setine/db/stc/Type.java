package com.setine.db.stc;

import com.setine.db.model.GarType;

public enum Type {

	TYPE1(new GarType("Mineral Deposit","")),
	TYPE2(new GarType("Rocky Outcropping","")),
	TYPE3(new GarType("Lush Vegetation","")),
	TYPE4(new GarType("Mature Tree",""))
	;
	
	private GarType state;
	
	private Type(final GarType state){
		this.state = state;
	}
	
	public GarType getState(){
		return this.state;
	}

	@Override
	public String toString(){
		return this.state.getIndex_en() + "," + this.state.getIndex_kr();
	}


	public String getName(){
		return this.name();
	}


}
