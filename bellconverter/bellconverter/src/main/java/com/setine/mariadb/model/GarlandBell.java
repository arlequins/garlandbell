package com.setine.mariadb.model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;

import org.hibernate.validator.constraints.NotEmpty;

@Entity
@Table(name="GARLAND_BELL")
public class GarlandBell {

	@Id @GeneratedValue(strategy=GenerationType.AUTO)
	@Column(name="ID")
	private int id;

	@NotEmpty
	@Column(name="`KEY`", nullable=false)
	private String key;
	
	@NotEmpty
	@Column(name="TYPE", nullable=false)
	private String type;
		
	@NotEmpty
	@Column(name="INDEX_KR", nullable=false)
	private String index_kr;

	@NotEmpty
	@Column(name="INDEX_JA", nullable=false)
	private String index_ja;

	@NotEmpty
	@Column(name="INDEX_EN", nullable=false)
	private String index_en;
	@NotEmpty
	@Column(name="PATH", nullable=false)
	private String path;
	
	public int getId() {
		return id;
	}

	public void setId(int id) {
		this.id = id;
	}

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

	@Override
	public int hashCode() {
		final int prime = 31;
		int result = 1;
		result = prime * result + id;
		return result;
	}
}
