package com.setine.mongodb;

import java.io.Serializable;
import java.lang.reflect.ParameterizedType;
import java.util.ArrayList;

import javax.persistence.EntityManager;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

public abstract class AbstractDao<PK extends Serializable, T> {

	private final Class<T> persistentClass;
	protected EntityManager entityManager;

	@SuppressWarnings("unchecked")
	public AbstractDao() {
		this.persistentClass = (Class<T>) ((ParameterizedType) this.getClass().getGenericSuperclass()).getActualTypeArguments()[1];
	}

	@Autowired
	MongoTemplate mongoTemplate;

	public T getByKey1(PK key, String collection_name) {
		return (T) mongoTemplate.findById(key, persistentClass, collection_name);
	}
	
	public T getByKey2(String key, String target, String collection_name) {
		Query searchQuery = new Query(Criteria.where(target).is(key));
		return (T) mongoTemplate.findById(searchQuery, persistentClass, collection_name);
	}

	public void setInsert(T entity, String collection_name) {
		mongoTemplate.insert(entity, collection_name);
	}
	
	public void setUpdate(String key, String target, String cKey, Object cValue, String collection_name) {
		Query searchQuery = new Query(Criteria.where(target).is(key));
		mongoTemplate.updateFirst(searchQuery, Update.update(cKey, cValue), persistentClass, collection_name);
	}

	public void delete(T entity, String collection_name) {
		mongoTemplate.remove(entity, collection_name);
	}

	public ArrayList<T> getAllList(String collection_name) {
		ArrayList<T> list = new ArrayList<T>();
		list = (ArrayList<T>) mongoTemplate.findAll(persistentClass, collection_name);

		return list;
	}
}
