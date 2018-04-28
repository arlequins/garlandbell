package com.setine.mongodb;

import java.util.ArrayList;

import org.springframework.stereotype.Repository;

import com.setine.db.model.Setine;

@Repository
public class GarlandDAOImpl extends AbstractDao<Integer, Setine> implements GarlandDAO {

	String collection_name = "Garland_data";
	String target = "key";
	
	@Override
	public Setine getGarlandOne(String key) {
		return getByKey2(key, target, collection_name);
	}

	@Override
	public ArrayList<Setine> getGarlandTxt() {
		return getAllList(collection_name);
	}

	@Override
	public Setine insert(Setine object) {
		setInsert(object, collection_name);
		return object;
	}

	@Override
	public void update(Setine object, String cKey, Object cValue) {
		String key = object.getKey();

		Setine preValue = getByKey2(object.getKey(), target, collection_name);

		// comparing values
		if (!object.equals(preValue)) {
			setUpdate(key, target, cKey, cValue, collection_name);
		}
	}

}