package com.setine.db.stc;

import com.setine.db.model.GarType;

public enum Name {

	TYPE1(new GarType("Unspoiled","")),
	TYPE2(new GarType("Legendary","")),
	TYPE3(new GarType("Ephemeral",""))
	;
	
	private GarType state;
	
	private Name(final GarType state){
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
