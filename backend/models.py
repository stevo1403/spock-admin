import enum

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum, text, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

from backend.db import db

class CustomBaseModel():
    created_at = Column(DateTime, server_default=text('now()'))
    updated_at = Column(DateTime, server_default=text('now()'), onupdate=text('now()'))

class ContentType(enum.Enum):
    card = "card"
    banner = "banner"
    image = "image"
    modal = "modal"

class Campaign(db.Model, CustomBaseModel):
    __tablename__ = 'campaign'
    __table_args__ = {'schema': 'spock_schema'}
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    contents = relationship("Content", back_populates="campaign")


class Content(db.Model, CustomBaseModel):
    __tablename__ = 'content'
    __table_args__ = {'schema': 'spock_schema'}

    id = Column(Integer, primary_key=True)
    content_type = Column(Enum(ContentType), nullable=False)

    order = Column(db.Integer, nullable=False)
    
    title = Column(String, nullable=False)
    subtitle = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    
    image_url = Column(String, nullable=True)  # URL for a locally-hosted image
    image_filename = Column(String, nullable=True)  # Filename of the uploaded image
    image_path = Column(String, nullable=True)  # Path to the uploaded image
    external_url = Column(String, nullable=True) # URL for a externally-hosted image
    
    button_text = Column(String, nullable=True)
    button_link = Column(String, nullable=True)
    
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)

    campaign_id = Column(Integer, ForeignKey('spock_schema.campaign.id'))
    campaign = relationship("Campaign", back_populates="contents")

    __table_args__ = (UniqueConstraint('campaign_id', 'order', name='_campaign_order_uc'),)

    